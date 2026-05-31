import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ArchivedTodoRow = {
  id: string;
  title: string;
  xp_reward: number;
  completed_at: string | null;
  todo_date: string;
};

function formatDate(value: string | null) {
  if (!value) {
    return "완료일 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(value));
}

export default async function TodoArchivePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: todos } = await supabase
    .from("todos")
    .select("id, title, xp_reward, completed_at, todo_date")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(120)
    .returns<ArchivedTodoRow[]>();
  const totalXp = (todos ?? []).reduce((sum, todo) => sum + todo.xp_reward, 0);

  return (
    <main className="simple-shell narrow">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <div>
          <h1>완료 아카이브</h1>
          <p className="subtle">
            {(todos ?? []).length}개 완료 · {totalXp.toLocaleString()} XP
          </p>
        </div>
      </header>

      <section className="panel archive-panel">
        <div className="archive-list">
          {(todos ?? []).map((todo) => (
            <article className="archive-row" key={todo.id}>
              <span className="archive-icon">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <strong>{todo.title}</strong>
                <p className="subtle">{formatDate(todo.completed_at)}</p>
              </div>
              <strong>{todo.xp_reward} XP</strong>
            </article>
          ))}
          {(todos ?? []).length === 0 ? (
            <div className="empty-state">아직 완료한 투두가 없어요.</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
