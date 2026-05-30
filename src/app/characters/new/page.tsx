import Image from "next/image";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { createCharacter } from "@/app/character-actions";
import {
  isLegacyStarterCharacter,
  MAX_CHARACTER_SLOTS
} from "@/lib/character-onboarding";
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
  const { data: activeCharacter } = await supabase
    .from("characters")
    .select("display_name, customization")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<{ display_name: string; customization: Record<string, string> }>();

  if ((count ?? 0) >= MAX_CHARACTER_SLOTS && !isLegacyStarterCharacter(activeCharacter)) {
    redirect("/characters?message=캐릭터 슬롯이 모두 찼어요." as Route);
  }

  const isFirstCharacter = (count ?? 0) === 0 || isLegacyStarterCharacter(activeCharacter);

  return (
    <main className="auth-shell">
      <section className="auth-panel character-create-panel">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1 className="brand">{isFirstCharacter ? "첫 캐릭터 생성" : "새 캐릭터 생성"}</h1>
          <p className="subtle">이름, 종류, 색상을 고른 뒤 투두 홈으로 이동합니다.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <form className="character-create-form" action={createCharacter}>
          <label>
            이름
            <input
              name="displayName"
              placeholder="캐릭터 이름"
              defaultValue={isLegacyStarterCharacter(activeCharacter) ? "" : undefined}
              maxLength={32}
              required
              autoFocus
            />
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
