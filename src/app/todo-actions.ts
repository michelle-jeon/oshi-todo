"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getXpRecommendation } from "@/app/xp-actions";

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type TodoData = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  priority: TodoPriority;
  xp_reward: number;
  base_xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  sort_order: number;
  routine_id: string | null;
};

type TodoPriority = "low" | "normal" | "high";

const TODO_SELECT_WITH_BASE =
  "id, title, status, priority, xp_reward, base_xp_reward, completed_at, todo_date, sort_order, routine_id";
const TODO_SELECT_WITHOUT_BASE =
  "id, title, status, priority, xp_reward, completed_at, todo_date, sort_order, routine_id";
const TODO_SELECT_LEGACY_WITH_BASE =
  "id, title, status, xp_reward, base_xp_reward, completed_at, todo_date, sort_order, routine_id";
const TODO_SELECT_LEGACY_WITHOUT_BASE =
  "id, title, status, xp_reward, completed_at, todo_date, sort_order, routine_id";

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

function cleanPriority(formData: FormData): TodoPriority {
  const value = String(formData.get("priority") ?? "normal");

  if (value === "low" || value === "normal" || value === "high") {
    return value;
  }

  return "normal";
}

function clampAdjustedXp(baseXpReward: number, xpReward: number) {
  const min = Math.max(1, baseXpReward - 10);
  const max = Math.min(100, baseXpReward + 10);

  return Math.min(max, Math.max(min, xpReward));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isMissingBaseXpError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("base_xp_reward");
}

function isMissingPriorityError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("priority");
}

function withFallbackBaseXp<T extends { xp_reward: number; priority?: TodoPriority }>(data: T) {
  return { ...data, base_xp_reward: data.xp_reward, priority: data.priority ?? "normal" };
}

export async function createTodo(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const title = cleanTitle(formData);
  const todoDate = cleanTodoDate(formData);
  const priority = cleanPriority(formData);

  if (!title) {
    return { ok: false, error: "할 일을 입력해 주세요." } satisfies ActionResult;
  }

  const xpRecommendation = await getXpRecommendation({ title, type: "todo" });
  const xpReward = xpRecommendation.xp;

  const { data: latestTodo } = await supabase
    .from("todos")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("todo_date", todoDate)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const insertPayload = {
    user_id: user.id,
    title,
    priority,
    base_xp_reward: xpReward,
    xp_reward: xpReward,
    todo_date: todoDate,
    sort_order: (latestTodo?.sort_order ?? 0) + 1000
  };
  const { data, error } = await supabase
    .from("todos")
    .insert(insertPayload)
    .select(TODO_SELECT_WITH_BASE)
    .single();

  if (error) {
    if (isMissingPriorityError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title,
          base_xp_reward: xpReward,
          xp_reward: xpReward,
          todo_date: todoDate,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select(TODO_SELECT_LEGACY_WITH_BASE)
        .single<Omit<TodoData, "priority">>();

      if (!legacyError && legacyData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...legacyData, priority: "normal" } as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: legacyError?.message ?? "할 일을 만들 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingBaseXpError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title,
          priority,
          xp_reward: xpReward,
          todo_date: todoDate,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select(TODO_SELECT_WITHOUT_BASE)
        .single<Omit<TodoData, "base_xp_reward">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackBaseXp(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      if (isMissingPriorityError(fallbackError)) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("todos")
          .insert({
            user_id: user.id,
            title,
            xp_reward: xpReward,
            todo_date: todoDate,
            sort_order: (latestTodo?.sort_order ?? 0) + 1000
          })
          .select(TODO_SELECT_LEGACY_WITHOUT_BASE)
          .single<Omit<TodoData, "base_xp_reward" | "priority">>();

        if (!legacyError && legacyData) {
          revalidatePath("/");
          return {
            ok: true,
            data: withFallbackBaseXp(legacyData) as TodoData
          } satisfies ActionResult<TodoData>;
        }

        return {
          ok: false,
          error: legacyError?.message ?? "할 일을 만들 수 없어요."
        } satisfies ActionResult;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "할 일을 만들 수 없어요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function toggleTodo(todoId: string, nextStatus: "open" | "completed") {
  await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
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
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data: null } satisfies ActionResult;
}

export async function updateTodoTitle(todoId: string, formData: FormData) {
  await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();
  const title = cleanTitle(formData);

  if (!title) {
    return { ok: false, error: "할 일을 비워둘 수 없어요." } satisfies ActionResult;
  }

  const xpRecommendation = await getXpRecommendation({ title, type: "todo" });

  const { data, error } = await supabase
    .from("todos")
    .update({
      title,
      base_xp_reward: xpRecommendation.xp,
      xp_reward: xpRecommendation.xp
    })
    .eq("id", todoId)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single();

  if (error) {
    if (isMissingPriorityError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .update({
          title,
          base_xp_reward: xpRecommendation.xp,
          xp_reward: xpRecommendation.xp
        })
        .eq("id", todoId)
        .eq("status", "open")
        .select(TODO_SELECT_LEGACY_WITH_BASE)
        .single<Omit<TodoData, "priority">>();

      if (!legacyError && legacyData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...legacyData, priority: "normal" } as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: legacyError?.message ?? "할 일을 수정할 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingBaseXpError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({
          title,
          xp_reward: xpRecommendation.xp
        })
        .eq("id", todoId)
        .eq("status", "open")
        .select(TODO_SELECT_WITHOUT_BASE)
        .single<Omit<TodoData, "base_xp_reward">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackBaseXp(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      if (isMissingPriorityError(fallbackError)) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("todos")
          .update({
            title,
            xp_reward: xpRecommendation.xp
          })
          .eq("id", todoId)
          .eq("status", "open")
          .select(TODO_SELECT_LEGACY_WITHOUT_BASE)
          .single<Omit<TodoData, "base_xp_reward" | "priority">>();

        if (!legacyError && legacyData) {
          revalidatePath("/");
          return {
            ok: true,
            data: withFallbackBaseXp(legacyData) as TodoData
          } satisfies ActionResult<TodoData>;
        }

        return {
          ok: false,
          error: legacyError?.message ?? "할 일을 수정할 수 없어요."
        } satisfies ActionResult;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "할 일을 수정할 수 없어요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function adjustTodoXp(todoId: string, direction: "down" | "up") {
  await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();
  const { data: todo, error: fetchError } = await supabase
    .from("todos")
    .select("base_xp_reward, xp_reward")
    .eq("id", todoId)
    .eq("status", "open")
    .single<{ base_xp_reward: number; xp_reward: number }>();

  if (fetchError && isMissingBaseXpError(fetchError)) {
    const { data: fallbackTodo, error: fallbackFetchError } = await supabase
      .from("todos")
      .select("xp_reward")
      .eq("id", todoId)
      .eq("status", "open")
      .single<{ xp_reward: number }>();

    if (fallbackFetchError || !fallbackTodo) {
      return {
        ok: false,
        error: fallbackFetchError?.message ?? "할 일을 찾을 수 없어요."
      } satisfies ActionResult;
    }

    const nextXp = clampAdjustedXp(
      fallbackTodo.xp_reward,
      fallbackTodo.xp_reward + (direction === "up" ? 10 : -10)
    );
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("todos")
      .update({ xp_reward: nextXp })
      .eq("id", todoId)
      .eq("status", "open")
      .select(TODO_SELECT_WITHOUT_BASE)
      .single<Omit<TodoData, "base_xp_reward">>();

    if (fallbackError && isMissingPriorityError(fallbackError)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .update({ xp_reward: nextXp })
        .eq("id", todoId)
        .eq("status", "open")
        .select(TODO_SELECT_LEGACY_WITHOUT_BASE)
        .single<Omit<TodoData, "base_xp_reward" | "priority">>();

      if (legacyError) {
        return { ok: false, error: legacyError.message } satisfies ActionResult;
      }

      if (!legacyData) {
        return { ok: false, error: "할 일을 찾을 수 없어요." } satisfies ActionResult;
      }

      revalidatePath("/");
      return {
        ok: true,
        data: withFallbackBaseXp(legacyData) as TodoData
      } satisfies ActionResult<TodoData>;
    }

    if (fallbackError) {
      return { ok: false, error: fallbackError.message } satisfies ActionResult;
    }

    if (!fallbackData) {
      return { ok: false, error: "할 일을 찾을 수 없어요." } satisfies ActionResult;
    }

    revalidatePath("/");
    return {
      ok: true,
      data: withFallbackBaseXp(fallbackData) as TodoData
    } satisfies ActionResult<TodoData>;
  }

  if (fetchError || !todo) {
    return { ok: false, error: fetchError?.message ?? "할 일을 찾을 수 없어요." } satisfies ActionResult;
  }

  const nextXp = clampAdjustedXp(
    todo.base_xp_reward,
    todo.xp_reward + (direction === "up" ? 10 : -10)
  );

  const { data, error } = await supabase
    .from("todos")
    .update({ xp_reward: nextXp })
    .eq("id", todoId)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single<TodoData>();

  if (error) {
    if (isMissingPriorityError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .update({ xp_reward: nextXp })
        .eq("id", todoId)
        .eq("status", "open")
        .select(TODO_SELECT_LEGACY_WITH_BASE)
        .single<Omit<TodoData, "priority">>();

      if (legacyError) {
        return { ok: false, error: legacyError.message } satisfies ActionResult;
      }

      if (!legacyData) {
        return { ok: false, error: "할 일을 찾을 수 없어요." } satisfies ActionResult;
      }

      revalidatePath("/");
      return {
        ok: true,
        data: { ...legacyData, priority: "normal" } as TodoData
      } satisfies ActionResult<TodoData>;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function updateTodoPriority(todoId: string, priority: TodoPriority) {
  await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .update({ priority })
    .eq("id", todoId)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single<TodoData>();

  if (error) {
    if (isMissingPriorityError(error)) {
      return {
        ok: false,
        error: "투두 우선순위 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 07_todo_priority.sql을 실행해 주세요."
      } satisfies ActionResult;
    }

    if (isMissingBaseXpError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({ priority })
        .eq("id", todoId)
        .eq("status", "open")
        .select(TODO_SELECT_WITHOUT_BASE)
        .single<Omit<TodoData, "base_xp_reward">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackBaseXp(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "우선순위를 수정할 수 없어요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function deleteTodo(todoId: string) {
  await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();

  const { error } = await supabase.from("todos").delete().eq("id", todoId);

  if (error) {
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data: null } satisfies ActionResult;
}

export async function reorderTodos(todoIds: string[]) {
  await requireUser();
  const supabase = await createClient();
  const persistedTodoIds = todoIds.filter(isUuid);

  const results = await Promise.all(
    persistedTodoIds.map((todoId, index) =>
      supabase
        .from("todos")
        .update({ sort_order: (index + 1) * 1000 })
        .eq("id", todoId)
        .eq("status", "open")
    )
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data: null } satisfies ActionResult;
}
