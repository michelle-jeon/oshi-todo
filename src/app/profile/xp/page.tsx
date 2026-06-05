import { ArrowLeft, Coins } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { loadXpLedgerPage } from "@/app/profile/xp/actions";
import { XpLedgerList } from "@/components/xp-ledger-list";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type CharacterXpRow = {
  xp_current: number;
  xp_total: number;
};

export default async function XpHistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: character }, initialLedgerPage] = await Promise.all([
    supabase
      .from("characters")
      .select("xp_current, xp_total")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle<CharacterXpRow>(),
    loadXpLedgerPage()
  ]);
  const spendableXp = character?.xp_current ?? 0;
  const lifetimeXp = character?.xp_total ?? 0;

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
            <Coins size={18} />
          </span>
          <div>
            <p className="subtle">사용 가능 XP</p>
            <strong>{spendableXp.toLocaleString()} XP</strong>
          </div>
        </div>
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Coins size={18} />
          </span>
          <div>
            <p className="subtle">누적 경험치</p>
            <strong>{lifetimeXp.toLocaleString()} XP</strong>
          </div>
        </div>
      </section>

      <section className="panel xp-ledger-panel">
        <h2>획득과 사용</h2>
        <XpLedgerList initialPage={initialLedgerPage} />
      </section>
    </main>
  );
}
