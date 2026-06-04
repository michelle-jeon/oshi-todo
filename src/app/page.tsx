import { Coins, DoorOpen, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { CharacterMenu } from "@/components/character-menu";
import { CharacterShowcase } from "@/components/character-showcase";
import { FocusTracker } from "@/components/focus-tracker";
import { TodoList } from "@/components/todo-list";
import { ensureUserBootstrap } from "@/lib/bootstrap-user";
import { isCharacterOnboardingComplete } from "@/lib/character-onboarding";
import type { CharacterSpecies } from "@/lib/character-assets";
import { DAILY_XP_CAP } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLevelProgress } from "@/lib/xp";
import { redirect } from "next/navigation";
import type { Route } from "next";

type CharacterRow = {
  id: string;
  display_name: string;
  species: CharacterSpecies;
  level: number;
  xp_current: number;
  xp_total: number;
  customization: Record<string, string>;
};

type TodoRowData = {
  id: string;
  title: string;
  status: "open" | "completed" | "archived";
  priority: "low" | "normal" | "high";
  xp_reward: number;
  base_xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  sort_order: number;
  routine_id: string | null;
};

type TodoRowDataWithoutBaseXp = Omit<TodoRowData, "base_xp_reward">;
type TodoRowDataWithoutPriority = Omit<TodoRowData, "priority">;
type TodoRowDataWithoutBaseXpAndPriority = Omit<
  TodoRowData,
  "base_xp_reward" | "priority"
>;

type FocusWindowLogRow = {
  id: string;
  work_date: string;
  window_key: string;
  display_name: string;
  full_name: string;
  seconds: number;
  xp: number;
  updated_at: string;
};

type XpEventRow = {
  amount: number;
};

type RoutineRowData = {
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

type RoutineRowDataWithoutBaseXp = Omit<RoutineRowData, "base_xp_reward">;

function getTodayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getKstDayBounds(dateString: string) {
  const start = new Date(`${dateString}T00:00:00+09:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function getDbSchemaMessage(error: unknown) {
  if (!error) {
    return null;
  }

  const message =
    typeof error === "object" && "message" in error ? String(error.message) : String(error);

  if (message.includes("base_xp_reward")) {
    return "AI XP 기준값 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/migrations/20260604093000_add_base_xp_rewards.sql 내용을 실행한 뒤 새로고침해 주세요.";
  }

  if (message.includes("priority")) {
    return "투두 우선순위 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/07_todo_priority.sql 내용을 실행한 뒤 새로고침해 주세요.";
  }

  if (message.includes("get_remaining_daily_xp") || message.includes("get_daily_xp_cap")) {
    return "하루 XP 상한 DB 함수가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/06_daily_xp_cap.sql 내용을 실행한 뒤 새로고침해 주세요.";
  }

  if (message.includes("ends_on")) {
    return "루틴 종료 기능 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/04_routine_end_and_indexes.sql 내용을 실행한 뒤 새로고침해 주세요.";
  }

  if (message.includes("schema cache")) {
    return "Supabase DB 스키마가 아직 준비되지 않았어요. 오류에 나온 컬럼이 포함된 migration을 SQL Editor에서 실행한 뒤 새로고침해 주세요.";
  }

  return "Supabase DB 스키마가 아직 준비되지 않았어요. SQL Editor에서 migration을 실행한 뒤 새로고침해 주세요.";
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

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const user = await requireUser();
  await ensureUserBootstrap({ id: user.id, email: user.email });
  const supabase = await createClient();
  const { message } = await searchParams;
  const todayString = getTodayString();
  const todayBounds = getKstDayBounds(todayString);
  const fetchTodos = async () => {
    const withBaseXp = await supabase
      .from("todos")
      .select("id, title, status, priority, xp_reward, base_xp_reward, completed_at, todo_date, sort_order, routine_id")
      .order("todo_date", { ascending: false })
      .order("status", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<TodoRowData[]>();

    if (!isMissingBaseXpError(withBaseXp.error) && !isMissingPriorityError(withBaseXp.error)) {
      return { ...withBaseXp, isBaseXpSchemaMissing: false, isPrioritySchemaMissing: false };
    }

    if (isMissingPriorityError(withBaseXp.error) && !isMissingBaseXpError(withBaseXp.error)) {
      const fallback = await supabase
        .from("todos")
        .select("id, title, status, xp_reward, base_xp_reward, completed_at, todo_date, sort_order, routine_id")
        .order("todo_date", { ascending: false })
        .order("status", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<TodoRowDataWithoutPriority[]>();

      return {
        data: fallback.data?.map((todo) => ({
          ...todo,
          priority: "normal" as const
        })) ?? null,
        error: fallback.error,
        isBaseXpSchemaMissing: false,
        isPrioritySchemaMissing: true
      };
    }

    const fallback = await supabase
      .from("todos")
      .select("id, title, status, priority, xp_reward, completed_at, todo_date, sort_order, routine_id")
      .order("todo_date", { ascending: false })
      .order("status", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<TodoRowDataWithoutBaseXp[]>();

    if (isMissingPriorityError(fallback.error)) {
      const legacyFallback = await supabase
        .from("todos")
        .select("id, title, status, xp_reward, completed_at, todo_date, sort_order, routine_id")
        .order("todo_date", { ascending: false })
        .order("status", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<TodoRowDataWithoutBaseXpAndPriority[]>();

      return {
        data: legacyFallback.data?.map((todo) => ({
          ...todo,
          priority: "normal" as const,
          base_xp_reward: todo.xp_reward
        })) ?? null,
        error: legacyFallback.error,
        isBaseXpSchemaMissing: true,
        isPrioritySchemaMissing: true
      };
    }

    return {
      data: fallback.data?.map((todo) => ({
        ...todo,
        base_xp_reward: todo.xp_reward
      })) ?? null,
      error: fallback.error,
      isBaseXpSchemaMissing: true,
      isPrioritySchemaMissing: false
    };
  };
  const fetchRoutines = async () => {
    const withBaseXp = await supabase
      .from("routines")
      .select("id, title, frequency, weekdays, xp_reward, base_xp_reward, is_active, starts_on, ends_on")
      .order("created_at", { ascending: false })
      .returns<RoutineRowData[]>();

    if (!isMissingBaseXpError(withBaseXp.error)) {
      return { ...withBaseXp, isBaseXpSchemaMissing: false };
    }

    const fallback = await supabase
      .from("routines")
      .select("id, title, frequency, weekdays, xp_reward, is_active, starts_on, ends_on")
      .order("created_at", { ascending: false })
      .returns<RoutineRowDataWithoutBaseXp[]>();

    return {
      data: fallback.data?.map((routine) => ({
        ...routine,
        base_xp_reward: routine.xp_reward
      })) ?? null,
      error: fallback.error,
      isBaseXpSchemaMissing: true
    };
  };

  const [
    { data: activeCharacter, error: characterError },
    {
      data: todos,
      error: todosError,
      isBaseXpSchemaMissing: isTodoBaseXpSchemaMissing,
      isPrioritySchemaMissing: isTodoPrioritySchemaMissing
    },
    { data: routines, error: routinesError, isBaseXpSchemaMissing: isRoutineBaseXpSchemaMissing },
    { data: focusLogs },
    { data: todayXpEvents },
    { error: dailyXpCapError }
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id, display_name, species, level, xp_current, xp_total, customization")
      .eq("is_active", true)
      .maybeSingle<CharacterRow>(),
    fetchTodos(),
    fetchRoutines(),
    supabase
      .from("focus_window_logs")
      .select("id, work_date, window_key, display_name, full_name, seconds, xp, updated_at")
      .order("work_date", { ascending: false })
      .order("updated_at", { ascending: false })
      .returns<FocusWindowLogRow[]>(),
    supabase
      .from("xp_events")
      .select("amount")
      .gte("created_at", todayBounds.start)
      .lt("created_at", todayBounds.end)
      .returns<XpEventRow[]>(),
    supabase.rpc("get_remaining_daily_xp", {
      target_date_input: todayString
    })
  ]);

  if (!activeCharacter && !characterError) {
    const { count } = await supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) > 0) {
      redirect("/characters" as Route);
    }

    redirect("/characters/new" as Route);
  }

  if (activeCharacter && !isCharacterOnboardingComplete(activeCharacter)) {
    redirect("/characters/new" as Route);
  }

  const character = activeCharacter
    ? {
        id: activeCharacter.id,
        displayName: activeCharacter.display_name,
        species: activeCharacter.species,
        level: activeCharacter.level,
        xpCurrent: activeCharacter.xp_current,
        xpTotal: activeCharacter.xp_total,
        customization: activeCharacter.customization
      }
    : null;

  const progress = getLevelProgress(character?.xpTotal ?? 0);
  const spendableXp = character?.xpCurrent ?? 0;
  const dbError = characterError ?? todosError ?? routinesError ?? dailyXpCapError;
  const dbSchemaMessage =
    isTodoBaseXpSchemaMissing || isRoutineBaseXpSchemaMissing
      ? "AI XP 기준값 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/05_base_xp_rewards.sql 내용을 실행한 뒤 새로고침해 주세요."
      : isTodoPrioritySchemaMissing
        ? "투두 우선순위 DB 스키마가 아직 반영되지 않았어요. SQL Editor에서 supabase/sql_editor/07_todo_priority.sql 내용을 실행한 뒤 새로고침해 주세요."
      : getDbSchemaMessage(dbError);
  const displayMessage = message?.includes("temp-") ? undefined : message;
  const todayFocusXp = (focusLogs ?? [])
    .filter((log) => log.work_date === todayString)
    .reduce((sum, log) => sum + log.xp, 0);
  const todayEarnedXp = (todayXpEvents ?? []).reduce((sum, event) => sum + event.amount, 0);
  const variantId =
    character && "variantId" in character.customization ? character.customization.variantId : undefined;

  return (
    <main className="app-shell">
      <aside className="character-panel">
        <div className="character-panel-top">
          <h1 className="brand">OshiTodo</h1>
          <CharacterMenu />
        </div>

        <CharacterShowcase
          species={character?.species ?? "human"}
          variantId={variantId}
        />

        <h2>{character?.displayName}</h2>
        <p className="subtle">
          Lv. {progress.level} · {progress.currentLevelXp}/{progress.xpForNextLevel} XP
        </p>
        <div className="progress-track" aria-label="레벨 진행도">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>

        <Link className="shop-link-button" href={"/shop" as Route}>
          <ShoppingBag size={18} /> 상점
        </Link>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div />
          <div className="topbar-actions">
            <div className="currency-pill" aria-label="경험치와 사용 가능 XP">
              <Coins size={18} />
              <span>
                <small>사용 가능</small>
                {spendableXp.toLocaleString()} XP
              </span>
              <span>
                <small>누적</small>
                {(character?.xpTotal ?? 0).toLocaleString()} XP
              </span>
              <span>
                <small>오늘</small>
                {todayEarnedXp.toLocaleString()}/{DAILY_XP_CAP.toLocaleString()} XP
              </span>
            </div>
            <Link className="topbar-link-button" href={"/plaza" as Route}>
              <DoorOpen size={18} /> 광장
            </Link>
            <AccountMenu email={user.email} />
          </div>
        </header>

        {displayMessage ? <p className="notice">{displayMessage}</p> : null}
        {dbSchemaMessage ? <p className="notice">{dbSchemaMessage}</p> : null}

        <div className="grid">
          <section className="panel">
            <TodoList
              initialRoutines={routines ?? []}
              initialSelectedDate={getTodayString()}
              initialTodos={todos ?? []}
            />
          </section>

          <FocusTracker
            initialLogs={focusLogs ?? []}
            initialSelectedDate={todayString}
            initialTodayXp={todayFocusXp}
          />
        </div>
      </section>
    </main>
  );
}
