import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { loadTodoArchivePage } from "@/app/todos/archive/actions";
import { TodoArchiveList } from "@/components/todo-archive-list";

export default async function TodoArchivePage() {
  const initialPage = await loadTodoArchivePage();

  return (
    <main className="simple-shell narrow">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <div>
          <h1>완료 아카이브</h1>
        </div>
      </header>

      <TodoArchiveList initialPage={initialPage} />
    </main>
  );
}
