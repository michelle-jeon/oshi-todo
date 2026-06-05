import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  KeyRound,
  Mail,
  UserRound
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { signOut } from "@/app/auth-actions";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  display_name: string | null;
  email: string | null;
};

function formatDate(value?: string) {
  if (!value) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function getProviders(user: Awaited<ReturnType<typeof requireUser>>) {
  const providers = new Set<string>();

  if (Array.isArray(user.app_metadata.providers)) {
    user.app_metadata.providers.forEach((provider) => {
      if (typeof provider === "string") {
        providers.add(provider);
      }
    });
  }

  user.identities?.forEach((identity) => {
    if (identity.provider) {
      providers.add(identity.provider);
    }
  });

  if (providers.size === 0 && user.app_metadata.provider) {
    providers.add(String(user.app_metadata.provider));
  }

  return Array.from(providers);
}

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  const providers = getProviders(user);
  const primaryEmail = profile?.email ?? user.email ?? "이메일 없음";

  return (
    <main className="simple-shell narrow">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <h1>계정 설정</h1>
      </header>

      <div className="profile-settings-grid">
        <section className="panel profile-panel">
          <h2>계정 정보</h2>
          <div className="profile-setting-row">
            <span className="profile-setting-icon">
              <UserRound size={18} />
            </span>
            <div>
              <span className="subtle">이름</span>
              <strong>{profile?.display_name ?? "이름 없음"}</strong>
            </div>
          </div>
          <div className="profile-setting-row">
            <span className="profile-setting-icon">
              <Mail size={18} />
            </span>
            <div>
              <span className="subtle">이메일</span>
              <strong>{primaryEmail}</strong>
            </div>
          </div>
          <div className="profile-setting-row">
            <span className="profile-setting-icon">
              <CalendarDays size={18} />
            </span>
            <div>
              <span className="subtle">가입일</span>
              <strong>{formatDate(user.created_at)}</strong>
            </div>
          </div>
        </section>

        <section className="panel profile-panel">
          <h2>로그인 연결</h2>
          <div className="profile-setting-row">
            <span className="profile-setting-icon">
              <KeyRound size={18} />
            </span>
            <div>
              <span className="subtle">연결된 로그인</span>
              <div className="provider-chip-list">
                {providers.length > 0 ? (
                  providers.map((provider) => (
                    <span className="provider-chip" key={provider}>
                      <CheckCircle2 size={14} /> {provider}
                    </span>
                  ))
                ) : (
                  <strong>연결 정보 없음</strong>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="panel profile-panel">
          <h2>계정 작업</h2>
          <Link className="ghost-button" href={"/profile/xp" as Route}>
            <Coins size={16} /> XP/재화 기록
          </Link>
          <Link className="ghost-button" href={"/profile/focus" as Route}>
            <Clock3 size={16} /> 작업시간 기록
          </Link>
          <form action={signOut}>
            <button className="ghost-button" type="submit">
              로그아웃
            </button>
          </form>
          <button className="ghost-button muted-action" type="button" disabled>
            계정 삭제 준비 중
          </button>
        </section>
      </div>
    </main>
  );
}
