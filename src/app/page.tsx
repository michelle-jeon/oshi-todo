import { Coins, Ellipsis, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth-actions";
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
};

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
    { data: todos, error: todosError }
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id, display_name, species, level, xp_current, xp_total, customization")
      .eq("is_active", true)
      .single<CharacterRow>(),
    supabase
      .from("todos")
      .select("id, title, status, xp_reward, completed_at")
      .order("created_at", { ascending: false })
      .returns<TodoRowData[]>()
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
  const dbError = characterError ?? todosError;
  const variantId =
    "variantId" in character.customization ? character.customization.variantId : undefined;

  return (
    <main className="app-shell">
      <aside className="character-panel">
        <div className="character-panel-top">
          <h1 className="brand">OshiTodo</h1>
          <details className="character-menu">
            <summary aria-label="캐릭터 메뉴">
              <Ellipsis size={20} />
            </summary>
            <div className="character-menu-panel">
              <Link className="ghost-button" href={"/characters/wardrobe" as Route}>
                캐릭터 옷장
              </Link>
              <button className="ghost-button" type="button" disabled>
                캐릭터 선택
              </button>
            </div>
          </details>
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
          <div>
            <h2>오늘의 퀘스트</h2>
          </div>
          <div className="topbar-actions">
            <div className="currency-pill" aria-label="보유 경험치">
              <Coins size={18} />
              <span>{spendableXp.toLocaleString()} XP</span>
            </div>
            <details className="account-menu">
              <summary>내정보</summary>
              <div className="account-menu-panel">
                <p className="subtle">로그인 계정</p>
                <strong>{user.email}</strong>
                <form action={signOut}>
                  <button className="ghost-button" type="submit">
                    로그아웃
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        {message ? <p className="notice">{message}</p> : null}
        {dbError ? (
          <p className="notice">
            Supabase DB 스키마가 아직 준비되지 않았어요. SQL Editor에서 migration을 실행한 뒤 새로고침해
            주세요.
          </p>
        ) : null}

        <div className="grid">
          <section className="panel">
            <TodoList initialTodos={todos ?? []} />
          </section>

          <FocusTracker />
        </div>
      </section>
    </main>
  );
}
