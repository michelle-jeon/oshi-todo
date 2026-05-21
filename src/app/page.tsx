import { Check, Coins, Lock, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { CharacterShowcase } from "@/components/character-showcase";
import { STARTER_CHARACTER } from "@/lib/game-config";
import { getLevelProgress } from "@/lib/xp";

const todos = [
  { id: "1", title: "오늘 MVP 화면 구조 잡기", xpReward: 10 },
  { id: "2", title: "Supabase 프로젝트 만들기", xpReward: 15 },
  { id: "3", title: "첫 캐릭터 색상 저장 연결", xpReward: 20 }
];

const shopItems = [
  { name: "민트 후드", cost: 80, slot: "옷" },
  { name: "별 머리핀", cost: 120, slot: "악세서리" },
  { name: "치즈 줄무늬", cost: 90, slot: "고양이 무늬" }
];

export default function Home() {
  const character = STARTER_CHARACTER;
  const progress = getLevelProgress(character.xpTotal);
  const spendableXp = character.xpCurrent;

  return (
    <main className="app-shell">
      <aside className="character-panel">
        <p className="subtle">MVP Preview</p>
        <h1 className="brand">OshiTodo</h1>
        <p className="subtle">할 일을 완료하면 현재 선택한 캐릭터가 경험치를 얻어요.</p>

        <CharacterShowcase />

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
            <p className="subtle">서버 연결 전까지는 UI와 데이터 모델을 먼저 맞추는 상태예요.</p>
          </div>
          <div className="topbar-actions">
            <div className="currency-pill" aria-label="보유 경험치">
              <Coins size={18} />
              <span>{spendableXp.toLocaleString()} XP</span>
            </div>
            <button className="primary-button" type="button">
              로그인 준비
            </button>
          </div>
        </header>

        <div className="grid">
          <section className="panel">
            <div className="form-row">
              <input placeholder="할 일을 입력하세요" aria-label="새 할 일" />
              <button className="icon-button" type="button" aria-label="할 일 추가">
                <Plus size={18} />
              </button>
            </div>

            <div className="todo-list">
              {todos.map((todo) => (
                <article className="todo-row" key={todo.id}>
                  <div>
                    <strong>{todo.title}</strong>
                    <p className="subtle">완료 보상 {todo.xpReward} XP</p>
                  </div>
                  <button className="icon-button" type="button" aria-label="완료">
                    <Check size={18} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel">
            <h3>
              <ShoppingBag size={18} /> 상점
            </h3>
            <p className="subtle">경험치로 꾸미기 아이템을 해금하는 구조입니다.</p>

            <div className="todo-list">
              {shopItems.map((item) => (
                <article className="shop-row" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="subtle">
                      {item.slot} · {item.cost} XP
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
