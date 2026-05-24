"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { DEFAULT_TODO_XP } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function cleanTitle(formData: FormData) {
  return String(formData.get("title") ?? "").trim().slice(0, 160);
}

function cleanTodoDate(formData: FormData) {
  const value = String(formData.get("todoDate") ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function createTodo(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const title = cleanTitle(formData);
  const todoDate = cleanTodoDate(formData);

  if (!title) {
    redirect("/?message=할 일을 입력해 주세요." as Route);
  }

  const { data: latestTodo } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("todo_date", todoDate)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: user.id,
      title,
      xp_reward: DEFAULT_TODO_XP,
      todo_date: todoDate,
      sort_order: (latestTodo?.sort_order ?? 0) + 1000
    })
    .select("id, title, status, xp_reward, completed_at, todo_date, sort_order")
    .single();

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
  return data;
}

export async function toggleTodo(todoId: string, nextStatus: "open" | "completed") {
  await requireUser();

  if (!isUuid(todoId)) {
    return;
  }

  const supabase = await createClient();

  const { error } =
    nextStatus === "completed"
      ? await supabase.rpc("complete_todo", {
          todo_id_input: todoId
        })
      : await supabase.rpc("undo_complete_todo", {
          todo_id_input: todoId
        });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}

export async function updateTodoTitle(todoId: string, formData: FormData) {
  await requireUser();

  if (!isUuid(todoId)) {
    return;
  }

  const supabase = await createClient();
  const title = cleanTitle(formData);

  if (!title) {
    redirect("/?message=할 일을 비워둘 수 없어요." as Route);
  }

  const { error } = await supabase
    .from("todos")
    .update({ title })
    .eq("id", todoId)
    .eq("status", "open");

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}

export async function deleteTodo(todoId: string) {
  await requireUser();

  if (!isUuid(todoId)) {
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase.from("todos").delete().eq("id", todoId);

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}

export async function reorderTodos(todoIds: string[]) {
  await requireUser();
  const supabase = await createClient();
  const persistedTodoIds = todoIds.filter(isUuid);

  await Promise.all(
    persistedTodoIds.map((todoId, index) =>
      supabase
        .from("todos")
        .update({ sort_order: (index + 1) * 1000 })
        .eq("id", todoId)
        .eq("status", "open")
    )
  );

  revalidatePath("/");
}
