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
  stell_balance: number;
};

export default async function XpHistoryPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const characterResult = await supabase
      .from("characters")
      .select("xp_current, xp_total, stell_balance")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle<CharacterXpRow>();
  const fallbackCharacterResult = characterResult.error?.message.includes("stell_balance")
    ? await supabase
        .from("characters")
        .select("xp_current, xp_total")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle<Omit<CharacterXpRow, "stell_balance">>()
    : null;
  const character = fallbackCharacterResult?.data
    ? { ...fallbackCharacterResult.data, stell_balance: fallbackCharacterResult.data.xp_current }
    : characterResult.data;
  const initialLedgerPage = await loadXpLedgerPage();
  const stellBalance = character?.stell_balance ?? 0;
  const lifetimeXp = character?.xp_total ?? 0;

  return (
    <main className="simple-shell narrow">
      <header className="simple-header">
        <Link className="ghost-button" href={"/profile" as Route}>
          <ArrowLeft size={16} /> 계정 설정
        </Link>
        <h1>경험치·스텔 기록</h1>
      </header>

      <section className="xp-summary-grid">
        <div className="panel xp-summary-card">
          <span className="profile-setting-icon">
            <Coins size={18} />
          </span>
          <div>
            <p className="subtle">보유 스텔</p>
            <strong>{stellBalance.toLocaleString()} 스텔</strong>
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
        <h2>획득과 사용 기록</h2>
        <XpLedgerList initialPage={initialLedgerPage} />
      </section>
    </main>
  );
}
