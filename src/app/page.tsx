import { Coins, DoorOpen, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/account-menu";
import { CharacterMenu } from "@/components/character-menu";
import { CharacterShowcase } from "@/components/character-showcase";
import { FocusTracker } from "@/components/focus-tracker";
import { TodoList } from "@/components/todo-list";
import { ensureUserBootstrap } from "@/lib/bootstrap-user";
import type { CharacterSpecies } from "@/lib/character-assets";
import { STARTER_CHARACTER } from "@/lib/game-config";
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
  xp_reward: number;
  completed_at: string | null;
  todo_date: string;
  sort_order: number;
  routine_id: string | null;
};

type XpEventRow = {
  amount: number;
  created_at: string;
};

type RoutineRowData = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  weekdays: number[];
  xp_reward: number;
  is_active: boolean;
  starts_on: string;
};

function getTodayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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

  const [
    { data: activeCharacter, error: characterError },
    { data: todos, error: todosError },
    { data: routines, error: routinesError },
    { data: focusEvents }
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id, display_name, species, level, xp_current, xp_total, customization")
      .eq("is_active", true)
      .single<CharacterRow>(),
    supabase
      .from("todos")
      .select("id, title, status, xp_reward, completed_at, todo_date, sort_order, routine_id")
      .order("todo_date", { ascending: false })
      .order("status", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<TodoRowData[]>(),
    supabase
      .from("routines")
      .select("id, title, frequency, weekdays, xp_reward, is_active, starts_on")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .returns<RoutineRowData[]>(),
    supabase
      .from("xp_events")
      .select("amount, created_at")
      .eq("reason", "focus_window")
      .gte("created_at", `${getTodayString()}T00:00:00+09:00`)
      .returns<XpEventRow[]>()
  ]);

  const character = activeCharacter
    ? {
        ...STARTER_CHARACTER,
        id: activeCharacter.id,
        displayName: activeCharacter.display_name,
        species: activeCharacter.species,
        level: activeCharacter.level,
        xpCurrent: activeCharacter.xp_current,
        xpTotal: activeCharacter.xp_total,
        customization: activeCharacter.customization
      }
    : STARTER_CHARACTER;

  if (!activeCharacter && !characterError) {
    redirect("/characters/new" as Route);
  }

  const progress = getLevelProgress(character.xpTotal);
  const spendableXp = character.xpCurrent;
  const dbError = characterError ?? todosError ?? routinesError;
  const displayMessage = message?.includes("temp-") ? undefined : message;
  const todayFocusXp = (focusEvents ?? []).reduce((sum, event) => sum + event.amount, 0);
  const variantId =
    "variantId" in character.customization ? character.customization.variantId : undefined;

  return (
    <main className="app-shell">
      <aside className="character-panel">
        <div className="character-panel-top">
          <h1 className="brand">OshiTodo</h1>
          <CharacterMenu />
        </div>

        <CharacterShowcase
          species={character.species}
          variantId={variantId}
        />

        <h2>{character.displayName}</h2>
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
            <div className="currency-pill" aria-label="보유 경험치">
              <Coins size={18} />
              <span>{spendableXp.toLocaleString()} XP</span>
            </div>
            <Link className="topbar-link-button" href={"/plaza" as Route}>
              <DoorOpen size={18} /> 광장
            </Link>
            <AccountMenu email={user.email} />
          </div>
        </header>

        {displayMessage ? <p className="notice">{displayMessage}</p> : null}
        {dbError ? (
          <p className="notice">
            Supabase DB 스키마가 아직 준비되지 않았어요. SQL Editor에서 migration을 실행한 뒤 새로고침해
            주세요.
          </p>
        ) : null}

        <div className="grid">
          <section className="panel">
            <TodoList
              initialRoutines={routines ?? []}
              initialSelectedDate={getTodayString()}
              initialTodos={todos ?? []}
            />
          </section>

          <FocusTracker initialTodayXp={todayFocusXp} />
        </div>
      </section>
    </main>
  );
}
