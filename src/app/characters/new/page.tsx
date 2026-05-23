import Image from "next/image";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { createCharacter } from "@/app/character-actions";
import { CHARACTER_VARIANTS } from "@/lib/character-assets";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type NewCharacterPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function NewCharacterPage({ searchParams }: NewCharacterPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { message } = await searchParams;
  const { count } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) {
    redirect("/" as Route);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel character-create-panel">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1 className="brand">첫 캐릭터 생성</h1>
          <p className="subtle">MVP에서는 캐릭터 슬롯 하나만 사용할 수 있어요.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <form className="character-create-form" action={createCharacter}>
          <label>
            이름
            <input name="displayName" defaultValue="첫 번째 친구" maxLength={32} />
          </label>

          <section>
            <h2>종류</h2>
            <div className="species-grid">
              <label className="choice-card">
                <input name="species" type="radio" value="human" defaultChecked />
                <Image
                  src="/assets/characters/human-outfit-blue.png"
                  alt="인간 캐릭터"
                  width={512}
                  height={512}
                />
                <span>인간</span>
              </label>
              <label className="choice-card">
                <input name="species" type="radio" value="cat" />
                <Image
                  src="/assets/characters/cat-pattern-blue.png"
                  alt="고양이 캐릭터"
                  width={512}
                  height={512}
                />
                <span>고양이</span>
              </label>
            </div>
          </section>

          <section>
            <h2>기본 색상</h2>
            <div className="color-choice-list">
              {CHARACTER_VARIANTS.map((variant, index) => (
                <label className="color-choice" key={variant.id}>
                  <input
                    name="variantId"
                    type="radio"
                    value={variant.id}
                    defaultChecked={index === 0}
                  />
                  <span className="swatch" style={{ background: variant.color }} />
                  {variant.label}
                </label>
              ))}
            </div>
          </section>

          <button className="primary-button" type="submit">
            이 캐릭터로 시작
          </button>
        </form>
      </section>
    </main>
  );
}
