"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const LEDGER_PAGE_SIZE = 20;

type XpEventRow = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  todos: {
    title: string | null;
  } | null;
};

type InventoryRow = {
  purchased_at: string;
  shop_items: {
    name: string;
    cost: number;
  } | null;
};

type ActiveCharacterRow = {
  id: string;
};

export type XpLedgerCursor = {
  gainOffset: number;
  spendOffset: number;
};

export type XpLedgerItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  type: "gain" | "spend";
};

export type XpLedgerPage = {
  items: XpLedgerItem[];
  nextCursor: XpLedgerCursor;
  hasMore: boolean;
};

function reasonLabel(event: XpEventRow) {
  if (event.reason === "todo_completed") {
    return {
      title: "투두 완료",
      description: event.todos?.title ?? "완료한 투두"
    };
  }

  if (event.reason === "focus_window") {
    return {
      title: "작업시간 보상",
      description: "작업창 집중으로 획득"
    };
  }

  return {
    title: "XP 획득",
    description: event.reason
  };
}

function normalizeCursor(cursor?: Partial<XpLedgerCursor> | null): XpLedgerCursor {
  return {
    gainOffset: Math.max(0, Number(cursor?.gainOffset ?? 0)),
    spendOffset: Math.max(0, Number(cursor?.spendOffset ?? 0))
  };
}

export async function loadXpLedgerPage(cursor?: Partial<XpLedgerCursor> | null) {
  const user = await requireUser();
  const supabase = await createClient();
  const normalizedCursor = normalizeCursor(cursor);
  const fetchSize = LEDGER_PAGE_SIZE + 1;
  const { data: activeCharacter, error: activeCharacterError } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<ActiveCharacterRow>();

  if (activeCharacterError) {
    throw new Error(activeCharacterError.message);
  }

  const [{ data: xpEvents, error: xpEventsError }, { data: purchases, error: purchasesError }] =
    await Promise.all([
      supabase
        .from("xp_events")
        .select("id, amount, reason, created_at, todos(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(normalizedCursor.gainOffset, normalizedCursor.gainOffset + fetchSize - 1)
        .returns<XpEventRow[]>(),
      activeCharacter
        ? supabase
            .from("character_inventory")
            .select("purchased_at, shop_items(name, cost)")
            .eq("character_id", activeCharacter.id)
            .order("purchased_at", { ascending: false })
            .range(normalizedCursor.spendOffset, normalizedCursor.spendOffset + fetchSize - 1)
            .returns<InventoryRow[]>()
        : Promise.resolve({ data: [], error: null })
    ]);

  if (xpEventsError) {
    throw new Error(xpEventsError.message);
  }

  if (purchasesError) {
    throw new Error(purchasesError.message);
  }

  const gainedItems: XpLedgerItem[] = (xpEvents ?? []).map((event) => {
    const label = reasonLabel(event);

    return {
      id: `gain:${event.id}`,
      title: label.title,
      description: label.description,
      amount: event.amount,
      createdAt: event.created_at,
      type: "gain"
    };
  });
  const spentItems: XpLedgerItem[] = (purchases ?? []).map((purchase, index) => ({
    id: `spend:${purchase.purchased_at}:${normalizedCursor.spendOffset + index}`,
    title: "상점 구매",
    description: purchase.shop_items?.name ?? "구매한 아이템",
    amount: purchase.shop_items?.cost ?? 0,
    createdAt: purchase.purchased_at,
    type: "spend"
  }));
  const sortedItems = [...gainedItems, ...spentItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  const items = sortedItems.slice(0, LEDGER_PAGE_SIZE);
  const usedGains = items.filter((item) => item.type === "gain").length;
  const usedSpends = items.filter((item) => item.type === "spend").length;

  return {
    items,
    nextCursor: {
      gainOffset: normalizedCursor.gainOffset + usedGains,
      spendOffset: normalizedCursor.spendOffset + usedSpends
    },
    hasMore: sortedItems.length > LEDGER_PAGE_SIZE
  } satisfies XpLedgerPage;
}
