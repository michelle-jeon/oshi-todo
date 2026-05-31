import { ArrowLeft, Coins, Minus, Plus } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

type LedgerItem = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
  type: "gain" | "spend";
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

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

export default async function XpHistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: xpEvents }, { data: purchases }] = await Promise.all([
    supabase
      .from("xp_events")
      .select("id, amount, reason, created_at, todos(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80)
      .returns<XpEventRow[]>(),
    supabase
      .from("character_inventory")
      .select("purchased_at, shop_items(name, cost)")
      .order("purchased_at", { ascending: false })
      .limit(80)
      .returns<InventoryRow[]>()
  ]);
  const gainedItems: LedgerItem[] = (xpEvents ?? []).map((event) => {
    const label = reasonLabel(event);

    return {
      id: event.id,
      title: label.title,
      description: label.description,
      amount: event.amount,
      createdAt: event.created_at,
      type: "gain"
    };
  });
  const spentItems: LedgerItem[] = (purchases ?? []).map((purchase, index) => ({
    id: `${purchase.purchased_at}-${index}`,
    title: "상점 구매",
    description: purchase.shop_items?.name ?? "구매한 아이템",
    amount: purchase.shop_items?.cost ?? 0,
    createdAt: purchase.purchased_at,
    type: "spend"
  }));
  const ledgerItems = [...gainedItems, ...spentItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  const gainedTotal = gainedItems.reduce((sum, item) => sum + item.amount, 0);
  const spentTotal = spentItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="simple-shell narrow">
      <header className="simple-header">
        <Link className="ghost-button" href={"/profile" as Route}>
          <ArrowLeft size={16} /> 계정 설정
        </Link>
        <h1>XP 기록</h1>
      </header>

      <section className="xp-summary-grid">
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Plus size={18} />
          </span>
          <div>
            <p className="subtle">최근 획득</p>
            <strong>{gainedTotal.toLocaleString()} XP</strong>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Minus size={18} />
          </span>
          <div>
            <p className="subtle">최근 사용</p>
            <strong>{spentTotal.toLocaleString()} XP</strong>
          </div>
        </div>
      </section>

      <section className="panel xp-ledger-panel">
        <h2>획득과 사용</h2>
        <div className="xp-ledger-list">
          {ledgerItems.map((item) => (
            <article className="xp-ledger-row" key={item.id}>
              <span className={`xp-ledger-icon ${item.type}`}>
                <Coins size={16} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span className="subtle">{formatDateTime(item.createdAt)}</span>
              </div>
              <strong className={item.type === "gain" ? "xp-gain" : "xp-spend"}>
                {item.type === "gain" ? "+" : "-"}
                {item.amount.toLocaleString()} XP
              </strong>
            </article>
          ))}
          {ledgerItems.length === 0 ? <div className="empty-state">XP 기록이 아직 없어요.</div> : null}
        </div>
      </section>
    </main>
  );
}
