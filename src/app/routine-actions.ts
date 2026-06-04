"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_TODO_XP } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getXpRecommendation } from "@/app/xp-actions";

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type RoutineData = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  weekdays: number[];
  xp_reward: number;
  base_xp_reward: number;
  is_active: boolean;
  starts_on: string;
  ends_on: string | null;
};

type TodoData = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  xp_reward: number;
  base_xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  sort_order: number;
  routine_id: string | null;
};

const ROUTINE_SELECT_WITH_BASE =
  "id, title, frequency, weekdays, xp_reward, base_xp_reward, is_active, starts_on, ends_on";
const ROUTINE_SELECT_WITHOUT_BASE =
  "id, title, frequency, weekdays, xp_reward, is_active, starts_on, ends_on";
const TODO_SELECT_WITH_BASE =
  "id, title, status, xp_reward, base_xp_reward, completed_at, todo_date, sort_order, routine_id";
const TODO_SELECT_WITHOUT_BASE =
  "id, title, status, xp_reward, completed_at, todo_date, sort_order, routine_id";

function cleanRoutineInput(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const frequency = String(formData.get("frequency") ?? "daily") === "weekly" ? "weekly" : "daily";
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  return { title, frequency, weekdays };
}

function clampAdjustedXp(baseXpReward: number, xpReward: number) {
  const min = Math.max(1, baseXpReward - 10);
  const max = Math.min(100, baseXpReward + 10);

  return Math.min(max, Math.max(min, xpReward));
}

function cleanTodoDate(formData: FormData) {
  const value = String(formData.get("todoDate") ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 10);
}

function isMissingBaseXpError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("base_xp_reward");
}

function withFallbackBaseXp<T extends { xp_reward: number }>(data: T) {
  return { ...data, base_xp_reward: data.xp_reward };
}

export async function createRoutine(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const { title, frequency, weekdays } = cleanRoutineInput(formData);
  const todoDate = cleanTodoDate(formData);

  if (!title) {
    return { ok: false, error: "루틴 이름을 입력해 주세요." } satisfies ActionResult;
  }

  const xpRecommendation = await getXpRecommendation({ title, type: "routine" });
  const xpReward = xpRecommendation.xp;

  const { data, error } = await supabase
    .from("routines")
    .insert({
      user_id: user.id,
      title,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : [],
      base_xp_reward: xpReward,
      xp_reward: xpReward,
      starts_on: todoDate,
      ends_on: null
    })
    .select(ROUTINE_SELECT_WITH_BASE)
    .single<RoutineData>();

  if (error) {
    if (isMissingBaseXpError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("routines")
        .insert({
          user_id: user.id,
          title,
          frequency,
          weekdays: frequency === "weekly" ? weekdays : [],
          xp_reward: xpReward,
          starts_on: todoDate,
          ends_on: null
        })
        .select(ROUTINE_SELECT_WITHOUT_BASE)
        .single<Omit<RoutineData, "base_xp_reward">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackBaseXp(fallbackData) as RoutineData
        } satisfies ActionResult<RoutineData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "루틴을 만들 수 없어요."
      } satisfies ActionResult;
    }

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

  const { data: currentRoutine, error: currentError } = await supabase
    .from("routines")
    .select("title, xp_reward, base_xp_reward")
    .eq("id", routineId)
    .single<{ title: string; xp_reward: number; base_xp_reward: number }>();

  if (currentError && isMissingBaseXpError(currentError)) {
    const { data: fallbackCurrentRoutine, error: fallbackCurrentError } = await supabase
      .from("routines")
      .select("title, xp_reward")
      .eq("id", routineId)
      .single<{ title: string; xp_reward: number }>();

    if (fallbackCurrentError || !fallbackCurrentRoutine) {
      return {
        ok: false,
        error: fallbackCurrentError?.message ?? "루틴을 찾을 수 없어요."
      } satisfies ActionResult;
    }

    const shouldRefreshXp = fallbackCurrentRoutine.title.trim() !== title;
    const xpRecommendation = shouldRefreshXp
      ? await getXpRecommendation({ title, type: "routine" })
      : null;
    const nextXpReward = xpRecommendation?.xp ?? fallbackCurrentRoutine.xp_reward;
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("routines")
      .update({
        title,
        frequency,
        weekdays: frequency === "weekly" ? weekdays : [],
        xp_reward: nextXpReward
      })
      .eq("id", routineId)
      .select(ROUTINE_SELECT_WITHOUT_BASE)
      .single<Omit<RoutineData, "base_xp_reward">>();

    if (fallbackError) {
      return { ok: false, error: fallbackError.message } satisfies ActionResult;
    }

    revalidatePath("/");
    if (!fallbackData) {
      return { ok: false, error: "루틴을 찾을 수 없어요." } satisfies ActionResult;
    }

    return {
      ok: true,
      data: withFallbackBaseXp(fallbackData) as RoutineData
    } satisfies ActionResult<RoutineData>;
  }

  if (currentError || !currentRoutine) {
    return { ok: false, error: currentError?.message ?? "루틴을 찾을 수 없어요." } satisfies ActionResult;
  }

  const shouldRefreshXp = currentRoutine.title.trim() !== title;
  const xpRecommendation = shouldRefreshXp
    ? await getXpRecommendation({ title, type: "routine" })
    : null;
  const nextBaseXpReward = xpRecommendation?.xp ?? currentRoutine.base_xp_reward;
  const nextXpReward = xpRecommendation?.xp ?? currentRoutine.xp_reward;

  const { data, error } = await supabase
    .from("routines")
    .update({
      title,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : [],
      base_xp_reward: nextBaseXpReward,
      xp_reward: nextXpReward
    })
    .eq("id", routineId)
    .select(ROUTINE_SELECT_WITH_BASE)
    .single<RoutineData>();

  if (error) {
    if (isMissingBaseXpError(error)) {
      return {
        ok: false,
        error: "AI XP 기준값 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 05_base_xp_rewards.sql을 실행해 주세요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function adjustRoutineXp(routineId: string, direction: "down" | "up") {
  await requireUser();
  const supabase = await createClient();

  const { data: routine, error: fetchError } = await supabase
    .from("routines")
    .select("base_xp_reward, xp_reward")
    .eq("id", routineId)
    .single<{ base_xp_reward: number; xp_reward: number }>();

  if (fetchError && isMissingBaseXpError(fetchError)) {
    const { data: fallbackRoutine, error: fallbackFetchError } = await supabase
      .from("routines")
      .select("xp_reward")
      .eq("id", routineId)
      .single<{ xp_reward: number }>();

    if (fallbackFetchError || !fallbackRoutine) {
      return {
        ok: false,
        error: fallbackFetchError?.message ?? "루틴을 찾을 수 없어요."
      } satisfies ActionResult;
    }

    const nextXp = clampAdjustedXp(
      fallbackRoutine.xp_reward,
      fallbackRoutine.xp_reward + (direction === "up" ? 10 : -10)
    );
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("routines")
      .update({ xp_reward: nextXp })
      .eq("id", routineId)
      .select(ROUTINE_SELECT_WITHOUT_BASE)
      .single<Omit<RoutineData, "base_xp_reward">>();

    if (fallbackError) {
      return { ok: false, error: fallbackError.message } satisfies ActionResult;
    }

    revalidatePath("/");
    if (!fallbackData) {
      return { ok: false, error: "루틴을 찾을 수 없어요." } satisfies ActionResult;
    }

    return {
      ok: true,
      data: withFallbackBaseXp(fallbackData) as RoutineData
    } satisfies ActionResult<RoutineData>;
  }

  if (fetchError || !routine) {
    return { ok: false, error: fetchError?.message ?? "루틴을 찾을 수 없어요." } satisfies ActionResult;
  }

  const nextXp = clampAdjustedXp(
    routine.base_xp_reward,
    routine.xp_reward + (direction === "up" ? 10 : -10)
  );

  const { data, error } = await supabase
    .from("routines")
    .update({ xp_reward: nextXp })
    .eq("id", routineId)
    .select(ROUTINE_SELECT_WITH_BASE)
    .single<RoutineData>();

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
    .select(ROUTINE_SELECT_WITH_BASE)
    .eq("id", routineId)
    .eq("user_id", user.id)
    .single<RoutineData>();

  if (routineError && isMissingBaseXpError(routineError)) {
    const { data: fallbackRoutine, error: fallbackRoutineError } = await supabase
      .from("routines")
      .select("id, title, frequency, weekdays, xp_reward, is_active, starts_on, ends_on")
      .eq("id", routineId)
      .eq("user_id", user.id)
      .single<Omit<RoutineData, "base_xp_reward">>();

    if (fallbackRoutineError || !fallbackRoutine) {
      return { ok: false, error: "루틴을 찾을 수 없어요." } satisfies ActionResult;
    }

    return completeRoutineWithData({
      routine: withFallbackBaseXp(fallbackRoutine) as RoutineData,
      supabase,
      userId: user.id,
      todoDate
    });
  }

  if (routineError || !routine) {
    return { ok: false, error: "루틴을 찾을 수 없어요." } satisfies ActionResult;
  }

  return completeRoutineWithData({
    routine,
    supabase,
    userId: user.id,
    todoDate
  });
}

async function completeRoutineWithData({
  routine,
  supabase,
  userId,
  todoDate
}: {
  routine: RoutineData;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  todoDate: string;
}) {

  const routineWeekday = new Date(`${todoDate}T00:00:00`).getDay();
  const appliesToDate =
    routine.starts_on <= todoDate &&
    (!routine.ends_on || todoDate < routine.ends_on) &&
    (routine.is_active || Boolean(routine.ends_on)) &&
    (routine.frequency === "daily" || routine.weekdays.includes(routineWeekday));

  if (!appliesToDate) {
    return { ok: false, error: "이 날짜에는 적용되지 않는 루틴이에요." } satisfies ActionResult;
  }

  const { data: latestTodo } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("todo_date", todoDate)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const { data: existingTodo } = await supabase
    .from("todos")
    .select("id, status")
    .eq("user_id", userId)
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
          user_id: userId,
          title: routine.title,
          base_xp_reward: routine.base_xp_reward ?? routine.xp_reward ?? DEFAULT_TODO_XP,
          xp_reward: routine.xp_reward ?? DEFAULT_TODO_XP,
          todo_date: todoDate,
          routine_id: routine.id,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select("id")
        .single<{ id: string }>();

  if (error || !todo) {
    if (error && isMissingBaseXpError(error)) {
      const { data: fallbackTodo, error: fallbackError } = await supabase
        .from("todos")
        .insert({
          user_id: userId,
          title: routine.title,
          xp_reward: routine.xp_reward ?? DEFAULT_TODO_XP,
          todo_date: todoDate,
          routine_id: routine.id,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select("id")
        .single<{ id: string }>();

      if (fallbackError || !fallbackTodo) {
        return {
          ok: false,
          error: fallbackError?.message ?? "루틴을 완료할 수 없어요."
        } satisfies ActionResult;
      }

      const { error: fallbackCompleteError } = await supabase.rpc("complete_todo", {
        todo_id_input: fallbackTodo.id
      });

      if (fallbackCompleteError) {
        return { ok: false, error: fallbackCompleteError.message } satisfies ActionResult;
      }

      const { data: fallbackCompletedTodo, error: fallbackCompletedTodoError } = await supabase
        .from("todos")
        .select(TODO_SELECT_WITHOUT_BASE)
        .eq("id", fallbackTodo.id)
        .single();

      if (fallbackCompletedTodoError || !fallbackCompletedTodo) {
        return {
          ok: false,
          error: fallbackCompletedTodoError?.message ?? "완료한 루틴을 불러올 수 없어요."
        } satisfies ActionResult;
      }

      revalidatePath("/");
      return {
        ok: true,
        data: withFallbackBaseXp(fallbackCompletedTodo) as TodoData
      } satisfies ActionResult<TodoData>;
    }

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
    .select(TODO_SELECT_WITH_BASE)
    .eq("id", todo.id)
    .single();

  if (!completedTodo) {
    const { data: fallbackCompletedTodo, error: fallbackCompletedTodoError } = await supabase
      .from("todos")
      .select(TODO_SELECT_WITHOUT_BASE)
      .eq("id", todo.id)
      .single<Omit<TodoData, "base_xp_reward">>();

    if (fallbackCompletedTodoError || !fallbackCompletedTodo) {
      return {
        ok: false,
        error: fallbackCompletedTodoError?.message ?? "완료한 루틴을 불러올 수 없어요."
      } satisfies ActionResult;
    }

    revalidatePath("/");
    return {
      ok: true,
      data: withFallbackBaseXp(fallbackCompletedTodo) as TodoData
    } satisfies ActionResult<TodoData>;
  }

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

export async function endRoutine(routineId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const endsOn = cleanTodoDate(formData);

  const { data, error } = await supabase
    .from("routines")
    .update({
      is_active: false,
      ends_on: endsOn
    })
    .eq("id", routineId)
    .eq("user_id", user.id)
    .select(ROUTINE_SELECT_WITH_BASE)
    .single<RoutineData>();

  if (error) {
    if (isMissingBaseXpError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("routines")
        .update({
          is_active: false,
          ends_on: endsOn
        })
        .eq("id", routineId)
        .eq("user_id", user.id)
        .select(ROUTINE_SELECT_WITHOUT_BASE)
        .single<Omit<RoutineData, "base_xp_reward">>();

      if (fallbackError || !fallbackData) {
        return {
          ok: false,
          error: fallbackError?.message ?? "루틴을 종료할 수 없어요."
        } satisfies ActionResult;
      }

      revalidatePath("/");
      return {
        ok: true,
        data: withFallbackBaseXp(fallbackData) as RoutineData
      } satisfies ActionResult<RoutineData>;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}
