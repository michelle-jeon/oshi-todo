import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  display_name: string | null;
  email: string | null;
};

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  return (
    <main className="simple-shell narrow">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <h1>내 프로필</h1>
      </header>

      <section className="panel profile-panel">
        <div>
          <span className="subtle">이름</span>
          <strong>{profile?.display_name ?? "이름 없음"}</strong>
        </div>
        <div>
          <span className="subtle">이메일</span>
          <strong>{profile?.email ?? user.email}</strong>
        </div>
      </section>
    </main>
  );
}
