"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TODO_XP } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function cleanRoutineInput(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const frequency = String(formData.get("frequency") ?? "daily") === "weekly" ? "weekly" : "daily";
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  return { title, frequency, weekdays };
}

function cleanTodoDate(formData: FormData) {
  const value = String(formData.get("todoDate") ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

export async function createRoutine(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { title, frequency, weekdays } = cleanRoutineInput(formData);

  if (!title) {
    return { ok: false, error: "루틴 이름을 입력해 주세요." } satisfies ActionResult;
  }

  const { data, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      title,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : [],
      starts_on: new Date().toISOString().slice(0, 10)
    })
    .select("id, title, frequency, weekdays, xp_reward, is_active, starts_on")
    .single();

  if (error) {
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function updateRoutine(routineId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { title, frequency, weekdays } = cleanRoutineInput(formData);

  if (!title) {
    return { ok: false, error: "루틴 이름을 입력해 주세요." } satisfies ActionResult;
  }

  const { data, error } = await supabase
    .from("routines")
    .update({
      title,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : []
    })
    .eq("id", routineId)
    .select("id, title, frequency, weekdays, xp_reward, is_active, starts_on")
    .single();

  if (error) {
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function completeRoutine(routineId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const todoDate = cleanTodoDate(formData);

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, title, xp_reward")
    .eq("id", routineId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<{ id: string; title: string; xp_reward: number }>();

  if (routineError || !routine) {
    return { ok: false, error: "루틴을 찾을 수 없어요." } satisfies ActionResult;
  }

  const { data: latestTodo } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("todo_date", todoDate)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data: existingTodo } = await supabase
    .from("todos")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("routine_id", routine.id)
    .eq("todo_date", todoDate)
    .maybeSingle<{ id: string; status: "open" | "completed" | "archived" }>();

  if (existingTodo?.status === "completed") {
    return { ok: false, error: "이미 완료한 루틴이에요." } satisfies ActionResult;
  }

  const { data: todo, error } = existingTodo
    ? { data: existingTodo, error: null }
    : await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title: routine.title,
          xp_reward: routine.xp_reward ?? DEFAULT_TODO_XP,
          todo_date: todoDate,
          routine_id: routine.id,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select("id")
        .single<{ id: string }>();

  if (error || !todo) {
    return {
      ok: false,
      error: error?.message ?? "루틴을 완료할 수 없어요."
    } satisfies ActionResult;
  }

  const { error: completeError } = await supabase.rpc("complete_todo", {
    todo_id_input: todo.id
  });

  if (completeError) {
    return { ok: false, error: completeError.message } satisfies ActionResult;
  }

  const { data: completedTodo } = await supabase
    .from("todos")
    .select("id, title, status, xp_reward, completed_at, todo_date, sort_order, routine_id")
    .eq("id", todo.id)
    .single();

  revalidatePath("/");
  return { ok: true, data: completedTodo } satisfies ActionResult<typeof completedTodo>;
}

export async function deleteRoutine(routineId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").delete().eq("id", routineId);

  if (error) {
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data: null } satisfies ActionResult;
}
