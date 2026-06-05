"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ARCHIVE_PAGE_SIZE = 30;

export type ArchivedTodoItem = {
  id: string;
  title: string;
  xpReward: number;
  completedAt: string | null;
  todoDate: string;
};

export type TodoArchivePageData = {
  items: ArchivedTodoItem[];
  nextOffset: number;
  hasMore: boolean;
  totalCount: number | null;
};

type ArchivedTodoRow = {
  id: string;
  title: string;
  xp_reward: number;
  completed_at: string | null;
  todo_date: string;
};

function normalizeOffset(offset?: number | null) {
  return Math.max(0, Number(offset ?? 0));
}

export async function loadTodoArchivePage(offset?: number | null) {
  const user = await requireUser();
  const supabase = await createClient();
  const normalizedOffset = normalizeOffset(offset);
  const { data, error, count } = await supabase
    .from("todos")
    .select("id, title, xp_reward, completed_at, todo_date", { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .range(normalizedOffset, normalizedOffset + ARCHIVE_PAGE_SIZE - 1)
    .returns<ArchivedTodoRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const items = (data ?? []).map((todo) => ({
    id: todo.id,
    title: todo.title,
    xpReward: todo.xp_reward,
    completedAt: todo.completed_at,
    todoDate: todo.todo_date
  }));
  const nextOffset = normalizedOffset + items.length;

  return {
    items,
    nextOffset,
    hasMore: typeof count === "number" ? nextOffset < count : items.length === ARCHIVE_PAGE_SIZE,
    totalCount: count
  } satisfies TodoArchivePageData;
}
