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

export async function createTodo(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const title = cleanTitle(formData);

  if (!title) {
    redirect("/?message=할 일을 입력해 주세요." as Route);
  }

  const { error } = await supabase.from("todos").insert({
    user_id: user.id,
    title,
    xp_reward: DEFAULT_TODO_XP
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}

export async function updateTodo(todoId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const title = cleanTitle(formData);

  if (!title) {
    redirect("/?message=수정할 내용을 입력해 주세요." as Route);
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

export async function completeTodo(todoId: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.rpc("complete_todo", {
    todo_id_input: todoId
  });

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}

export async function deleteTodo(todoId: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("todos").delete().eq("id", todoId);

  if (error) {
    redirect(`/?message=${encodeURIComponent(error.message)}` as Route);
  }

  revalidatePath("/");
}
