"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_TODO_PRIORITY,
  DEFAULT_XP_DIFFICULTY,
  getXpRewardForDifficulty,
  isTodoPriority,
  isXpDifficulty,
  type TodoPriority,
  type XpDifficulty
} from "@/lib/game-config";

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type TodoData = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  xp_difficulty: XpDifficulty;
  priority: TodoPriority;
  xp_reward: number;
  base_xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  due_date: string | null;
  sort_order: number;
  routine_id: string | null;
};

const TODO_SELECT_WITH_BASE =
  "id, title, status, xp_difficulty, priority, xp_reward, base_xp_reward, completed_at, todo_date, due_date, sort_order, routine_id";
const TODO_SELECT_WITHOUT_BASE =
  "id, title, status, xp_difficulty, priority, xp_reward, completed_at, todo_date, due_date, sort_order, routine_id";
const TODO_SELECT_LEGACY_WITH_BASE =
  "id, title, status, priority, xp_reward, base_xp_reward, completed_at, todo_date, due_date, sort_order, routine_id";
const TODO_SELECT_LEGACY_WITHOUT_BASE =
  "id, title, status, priority, xp_reward, completed_at, todo_date, due_date, sort_order, routine_id";
const TODO_SELECT_WITH_BASE_WITHOUT_PRIORITY =
  "id, title, status, xp_difficulty, xp_reward, base_xp_reward, completed_at, todo_date, due_date, sort_order, routine_id";
const TODO_SELECT_WITH_BASE_WITHOUT_DUE_DATE =
  "id, title, status, xp_difficulty, priority, xp_reward, base_xp_reward, completed_at, todo_date, sort_order, routine_id";

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

function cleanDueDate(formData: FormData) {
  const value = String(formData.get("dueDate") ?? "").trim();

  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return null;
}

function cleanDifficulty(formData: FormData): XpDifficulty {
  const value = String(formData.get("xpDifficulty") ?? DEFAULT_XP_DIFFICULTY);

  if (isXpDifficulty(value)) {
    return value;
  }

  return DEFAULT_XP_DIFFICULTY;
}

function cleanPriority(formData: FormData): TodoPriority {
  const value = String(formData.get("priority") ?? DEFAULT_TODO_PRIORITY);

  if (isTodoPriority(value)) {
    return value;
  }

  return DEFAULT_TODO_PRIORITY;
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

function isMissingDifficultyError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("xp_difficulty");
}

function isMissingPriorityError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("priority");
}

function isMissingDueDateError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : String(error ?? "");

  return message.includes("due_date");
}

function withFallbackBaseXp<T extends { xp_reward: number; xp_difficulty?: XpDifficulty; priority?: TodoPriority }>(data: T) {
  return {
    ...data,
    base_xp_reward: data.xp_reward,
    xp_difficulty: data.xp_difficulty ?? DEFAULT_XP_DIFFICULTY,
    priority: data.priority ?? DEFAULT_TODO_PRIORITY
  };
}

function withFallbackDueDate<T>(data: T) {
  return {
    ...data,
    due_date: null
  };
}

export async function createTodo(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const title = cleanTitle(formData);
  const todoDate = cleanTodoDate(formData);
  const dueDate = cleanDueDate(formData);
  const xpDifficulty = cleanDifficulty(formData);
  const priority = cleanPriority(formData);
  const xpReward = getXpRewardForDifficulty(xpDifficulty);

  if (!title) {
    return { ok: false, error: "할 일을 입력해 주세요." } satisfies ActionResult;
  }

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
    xp_difficulty: xpDifficulty,
    priority,
    base_xp_reward: xpReward,
    xp_reward: xpReward,
    todo_date: todoDate,
    due_date: dueDate,
    sort_order: (latestTodo?.sort_order ?? 0) + 1000
  };
  const { data, error } = await supabase
    .from("todos")
    .insert(insertPayload)
    .select(TODO_SELECT_WITH_BASE)
    .single();

  if (error) {
    if (isMissingDueDateError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title,
          xp_difficulty: xpDifficulty,
          priority,
          base_xp_reward: xpReward,
          xp_reward: xpReward,
          todo_date: todoDate,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select(TODO_SELECT_WITH_BASE_WITHOUT_DUE_DATE)
        .single<Omit<TodoData, "due_date">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackDueDate(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "할 일을 만들 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingPriorityError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title,
          xp_difficulty: xpDifficulty,
          base_xp_reward: xpReward,
          xp_reward: xpReward,
          todo_date: todoDate,
          due_date: dueDate,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select(TODO_SELECT_WITH_BASE_WITHOUT_PRIORITY)
        .single<Omit<TodoData, "priority">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...fallbackData, priority: DEFAULT_TODO_PRIORITY } as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "할 일을 만들 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingDifficultyError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .insert({
          user_id: user.id,
          title,
          priority,
          base_xp_reward: xpReward,
          xp_reward: xpReward,
          todo_date: todoDate,
          due_date: dueDate,
          sort_order: (latestTodo?.sort_order ?? 0) + 1000
        })
        .select(TODO_SELECT_LEGACY_WITH_BASE)
        .single<Omit<TodoData, "xp_difficulty">>();

      if (!legacyError && legacyData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...legacyData, xp_difficulty: DEFAULT_XP_DIFFICULTY } as TodoData
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
          xp_difficulty: xpDifficulty,
          priority,
          xp_reward: xpReward,
          todo_date: todoDate,
          due_date: dueDate,
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

      if (isMissingDifficultyError(fallbackError)) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("todos")
          .insert({
            user_id: user.id,
            title,
            priority,
            xp_reward: xpReward,
            todo_date: todoDate,
            due_date: dueDate,
            sort_order: (latestTodo?.sort_order ?? 0) + 1000
          })
          .select(TODO_SELECT_LEGACY_WITHOUT_BASE)
          .single<Omit<TodoData, "base_xp_reward" | "xp_difficulty">>();

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
  const user = await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();
  const title = cleanTitle(formData);

  if (!title) {
    return { ok: false, error: "할 일을 비워둘 수 없어요." } satisfies ActionResult;
  }

  const { data, error } = await supabase
    .from("todos")
    .update({ title })
    .eq("id", todoId)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single();

  if (error) {
    if (isMissingDueDateError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({ title })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_WITH_BASE_WITHOUT_DUE_DATE)
        .single<Omit<TodoData, "due_date">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackDueDate(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "할 일을 수정할 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingPriorityError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({ title })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_WITH_BASE_WITHOUT_PRIORITY)
        .single<Omit<TodoData, "priority">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...fallbackData, priority: DEFAULT_TODO_PRIORITY } as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "할 일을 수정할 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingDifficultyError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .update({ title })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_LEGACY_WITH_BASE)
        .single<Omit<TodoData, "xp_difficulty">>();

      if (!legacyError && legacyData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...legacyData, xp_difficulty: DEFAULT_XP_DIFFICULTY } as TodoData
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
        .update({ title })
        .eq("id", todoId)
        .eq("user_id", user.id)
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

      if (isMissingDifficultyError(fallbackError)) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("todos")
          .update({ title })
          .eq("id", todoId)
          .eq("user_id", user.id)
          .eq("status", "open")
          .select(TODO_SELECT_LEGACY_WITHOUT_BASE)
          .single<Omit<TodoData, "base_xp_reward" | "xp_difficulty">>();

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

export async function updateTodoPriority(todoId: string, priority: TodoPriority) {
  const user = await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("todos")
    .update({ priority })
    .eq("id", todoId)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single<TodoData>();

  if (error) {
    if (isMissingDueDateError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({ priority })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_WITH_BASE_WITHOUT_DUE_DATE)
        .single<Omit<TodoData, "due_date">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackDueDate(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "우선순위를 수정할 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingPriorityError(error)) {
      return {
        ok: false,
        error: "투두 우선순위 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/07_todo_priority.sql 내용을 실행한 뒤 새로고침해 주세요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function updateTodoDifficulty(todoId: string, xpDifficulty: XpDifficulty) {
  const user = await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();
  const xpReward = getXpRewardForDifficulty(xpDifficulty);

  const { data, error } = await supabase
    .from("todos")
    .update({
      xp_difficulty: xpDifficulty,
      base_xp_reward: xpReward,
      xp_reward: xpReward
    })
    .eq("id", todoId)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single<TodoData>();

  if (error) {
    if (isMissingDueDateError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({
          xp_difficulty: xpDifficulty,
          base_xp_reward: xpReward,
          xp_reward: xpReward
        })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_WITH_BASE_WITHOUT_DUE_DATE)
        .single<Omit<TodoData, "due_date">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: withFallbackDueDate(fallbackData) as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "난이도를 수정할 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingPriorityError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({
          xp_difficulty: xpDifficulty,
          base_xp_reward: xpReward,
          xp_reward: xpReward
        })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_WITH_BASE_WITHOUT_PRIORITY)
        .single<Omit<TodoData, "priority">>();

      if (!fallbackError && fallbackData) {
        revalidatePath("/");
        return {
          ok: true,
          data: { ...fallbackData, priority: DEFAULT_TODO_PRIORITY } as TodoData
        } satisfies ActionResult<TodoData>;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "난이도를 수정할 수 없어요."
      } satisfies ActionResult;
    }

    if (isMissingDifficultyError(error)) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("todos")
        .update({
          base_xp_reward: xpReward,
          xp_reward: xpReward
        })
        .eq("id", todoId)
        .eq("user_id", user.id)
        .eq("status", "open")
        .select(TODO_SELECT_LEGACY_WITH_BASE)
        .single<Omit<TodoData, "xp_difficulty">>();

      if (legacyError) {
        return { ok: false, error: legacyError.message } satisfies ActionResult;
      }

      if (!legacyData) {
        return { ok: false, error: "할 일을 찾을 수 없어요." } satisfies ActionResult;
      }

      revalidatePath("/");
      return {
        ok: true,
        data: { ...legacyData, xp_difficulty: DEFAULT_XP_DIFFICULTY } as TodoData
      } satisfies ActionResult<TodoData>;
    }

    if (isMissingBaseXpError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("todos")
        .update({
          xp_difficulty: xpDifficulty,
          xp_reward: xpReward
        })
        .eq("id", todoId)
        .eq("user_id", user.id)
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

      if (isMissingDifficultyError(fallbackError)) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("todos")
          .update({ xp_reward: xpReward })
          .eq("id", todoId)
          .eq("user_id", user.id)
          .eq("status", "open")
          .select(TODO_SELECT_LEGACY_WITHOUT_BASE)
          .single<Omit<TodoData, "base_xp_reward" | "xp_difficulty">>();

        if (!legacyError && legacyData) {
          revalidatePath("/");
          return {
            ok: true,
            data: withFallbackBaseXp(legacyData) as TodoData
          } satisfies ActionResult<TodoData>;
        }

        return {
          ok: false,
          error: legacyError?.message ?? "난이도를 수정할 수 없어요."
        } satisfies ActionResult;
      }

      return {
        ok: false,
        error: fallbackError?.message ?? "난이도를 수정할 수 없어요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function updateTodoDueDate(todoId: string, dueDate: string | null) {
  const user = await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return { ok: false, error: "마감일 형식이 올바르지 않아요." } satisfies ActionResult;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .update({ due_date: dueDate })
    .eq("id", todoId)
    .eq("user_id", user.id)
    .eq("status", "open")
    .select(TODO_SELECT_WITH_BASE)
    .single<TodoData>();

  if (error) {
    if (isMissingDueDateError(error)) {
      return {
        ok: false,
        error: "투두 마감일 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/11_todo_due_dates.sql 내용을 실행한 뒤 새로고침해 주세요."
      } satisfies ActionResult;
    }

    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data } satisfies ActionResult<typeof data>;
}

export async function deleteTodo(todoId: string) {
  const user = await requireUser();

  if (!isUuid(todoId)) {
    return { ok: false, error: "잘못된 할 일이에요." } satisfies ActionResult;
  }

  const supabase = await createClient();

  const { error } = await supabase.from("todos").delete().eq("id", todoId).eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message } satisfies ActionResult;
  }

  revalidatePath("/");
  return { ok: true, data: null } satisfies ActionResult;
}

export async function reorderTodos(todoIds: string[]) {
  const user = await requireUser();
  const supabase = await createClient();
  const persistedTodoIds = todoIds.filter(isUuid);

  const results = await Promise.all(
    persistedTodoIds.map((todoId, index) =>
      supabase
        .from("todos")
        .update({ sort_order: (index + 1) * 1000 })
        .eq("id", todoId)
        .eq("user_id", user.id)
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
