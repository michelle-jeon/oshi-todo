import { Coins, Lock, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { createTodo } from "@/app/todo-actions";
import { CharacterShowcase } from "@/components/character-showcase";
import { TodoRow } from "@/components/todo-row";
import { ensureUserBootstrap } from "@/lib/bootstrap-user";
import { STARTER_CHARACTER } from "@/lib/game-config";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLevelProgress } from "@/lib/xp";

type CharacterRow = {
  id: string;
  display_name: string;
  species: "human" | "cat";
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

type ShopItemRow = {
  id: string;
  name: string;
  cost: number;
  slot: string;
};

function formatSlot(slot: string) {
  const labels: Record<string, string> = {
    human_hair: "머리",
    human_outfit: "옷",
    cat_pattern: "고양이 무늬",
    accessory: "악세서리",
    room_item: "방 아이템",
    mount: "탈 것"
  };

  return labels[slot] ?? slot;
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
    { data: shopItems, error: shopError }
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
      .returns<TodoRowData[]>(),
    supabase
      .from("shop_items")
      .select("id, name, cost, slot")
      .eq("is_active", true)
      .order("cost", { ascending: true })
      .returns<ShopItemRow[]>()
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
  const progress = getLevelProgress(character.xpTotal);
  const spendableXp = character.xpCurrent;
  const dbError = characterError ?? todosError ?? shopError;

  return (
    <main className="app-shell">
      <aside className="character-panel">
        <p className="subtle">MVP Preview</p>
        <h1 className="brand">OshiTodo</h1>
        <p className="subtle">할 일을 완료하면 현재 선택한 캐릭터가 경험치를 얻어요.</p>

        <CharacterShowcase initialSpecies={character.species} />

        <h2>{character.displayName}</h2>
        <p className="subtle">
          Lv. {progress.level} · {progress.currentLevelXp}/{progress.xpForNextLevel} XP
        </p>
        <div className="progress-track" aria-label="레벨 진행도">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>

      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h2>오늘의 퀘스트</h2>
            <p className="subtle">{user.email}</p>
          </div>
          <div className="topbar-actions">
            <div className="currency-pill" aria-label="보유 경험치">
              <Coins size={18} />
              <span>{spendableXp.toLocaleString()} XP</span>
            </div>
            <form action={signOut}>
              <button className="ghost-button" type="submit">
                로그아웃
              </button>
            </form>
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
            <form className="form-row" action={createTodo}>
              <input name="title" placeholder="할 일을 입력하세요" aria-label="새 할 일" />
              <button className="icon-button" type="submit" aria-label="할 일 추가">
                <Plus size={18} />
              </button>
            </form>

            <div className="todo-list">
              {(todos ?? []).map((todo) => (
                <TodoRow todo={todo} key={todo.id} />
              ))}
              {(todos ?? []).length === 0 ? (
                <div className="empty-state">첫 퀘스트를 추가해볼까요?</div>
              ) : null}
            </div>
          </section>

          <aside className="panel">
            <h3>
              <ShoppingBag size={18} /> 상점
            </h3>
            <p className="subtle">경험치로 꾸미기 아이템을 해금하는 구조입니다.</p>

            <div className="todo-list">
              {(shopItems ?? []).map((item) => (
                <article className="shop-row" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="subtle">
                      {formatSlot(item.slot)} · {item.cost} XP
                    </p>
                  </div>
                  <Lock size={18} />
                </article>
              ))}
            </div>

            <button className="ghost-button" style={{ marginTop: 14 }} type="button">
              <Sparkles size={16} /> 캐릭터 생성 플로우
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
