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
  shop_item_id: string;
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
  gainCreatedAt: string | null;
  gainId: string | null;
  spendPurchasedAt: string | null;
  spendShopItemId: string | null;
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

type XpLedgerItemWithCursor = XpLedgerItem & {
  cursorCreatedAt: string;
  cursorId: string;
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
    gainCreatedAt: cursor?.gainCreatedAt ?? null,
    gainId: cursor?.gainId ?? null,
    spendPurchasedAt: cursor?.spendPurchasedAt ?? null,
    spendShopItemId: cursor?.spendShopItemId ?? null
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

  let xpEventsQuery = supabase
    .from("xp_events")
    .select("id, amount, reason, created_at, todos(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(fetchSize);

  if (normalizedCursor.gainCreatedAt && normalizedCursor.gainId) {
    xpEventsQuery = xpEventsQuery.or(
      `created_at.lt.${normalizedCursor.gainCreatedAt},and(created_at.eq.${normalizedCursor.gainCreatedAt},id.lt.${normalizedCursor.gainId})`
    );
  }

  let purchasesQuery = activeCharacter
    ? supabase
        .from("character_inventory")
        .select("shop_item_id, purchased_at, shop_items(name, cost)")
        .eq("character_id", activeCharacter.id)
        .order("purchased_at", { ascending: false })
        .order("shop_item_id", { ascending: false })
        .limit(fetchSize)
    : null;

  if (purchasesQuery && normalizedCursor.spendPurchasedAt && normalizedCursor.spendShopItemId) {
    purchasesQuery = purchasesQuery.or(
      `purchased_at.lt.${normalizedCursor.spendPurchasedAt},and(purchased_at.eq.${normalizedCursor.spendPurchasedAt},shop_item_id.lt.${normalizedCursor.spendShopItemId})`
    );
  }

  const [{ data: xpEvents, error: xpEventsError }, { data: purchases, error: purchasesError }] =
    await Promise.all([
      xpEventsQuery.returns<XpEventRow[]>(),
      purchasesQuery ? purchasesQuery.returns<InventoryRow[]>() : Promise.resolve({ data: [], error: null })
    ]);

  if (xpEventsError) {
    throw new Error(xpEventsError.message);
  }

  if (purchasesError) {
    throw new Error(purchasesError.message);
  }

  const gainedItems: XpLedgerItemWithCursor[] = (xpEvents ?? []).map((event) => {
    const label = reasonLabel(event);

    return {
      id: `gain:${event.id}`,
      title: label.title,
      description: label.description,
      amount: event.amount,
      createdAt: event.created_at,
      type: "gain",
      cursorCreatedAt: event.created_at,
      cursorId: event.id
    };
  });
  const spentItems: XpLedgerItemWithCursor[] = (purchases ?? []).map((purchase) => ({
    id: `spend:${purchase.purchased_at}:${purchase.shop_item_id}`,
    title: "상점 구매",
    description: purchase.shop_items?.name ?? "구매한 아이템",
    amount: purchase.shop_items?.cost ?? 0,
    createdAt: purchase.purchased_at,
    type: "spend",
    cursorCreatedAt: purchase.purchased_at,
    cursorId: purchase.shop_item_id
  }));
  const sortedItems = [...gainedItems, ...spentItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  const items = sortedItems.slice(0, LEDGER_PAGE_SIZE);
  const lastGain = items.filter((item) => item.type === "gain").at(-1);
  const lastSpend = items.filter((item) => item.type === "spend").at(-1);
  const publicItems: XpLedgerItem[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    amount: item.amount,
    createdAt: item.createdAt,
    type: item.type
  }));

  return {
    items: publicItems,
    nextCursor: {
      gainCreatedAt: lastGain?.cursorCreatedAt ?? normalizedCursor.gainCreatedAt,
      gainId: lastGain?.cursorId ?? normalizedCursor.gainId,
      spendPurchasedAt: lastSpend?.cursorCreatedAt ?? normalizedCursor.spendPurchasedAt,
      spendShopItemId: lastSpend?.cursorId ?? normalizedCursor.spendShopItemId
    },
    hasMore: sortedItems.length > LEDGER_PAGE_SIZE
  } satisfies XpLedgerPage;
}
