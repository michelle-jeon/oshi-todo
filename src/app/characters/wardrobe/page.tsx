import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { updateWardrobe } from "@/app/character-actions";
import { CHARACTER_VARIANTS, getCharacterAsset, type CharacterSpecies } from "@/lib/character-assets";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type CharacterRow = {
  id: string;
  display_name: string;
  species: CharacterSpecies;
  customization: Record<string, string>;
};

type WardrobePageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function WardrobePage({ searchParams }: WardrobePageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { message } = await searchParams;
  const { data: character } = await supabase
    .from("characters")
    .select("id, display_name, species, customization")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single<CharacterRow>();

  if (!character) {
    redirect("/characters/new" as Route);
  }

  const currentVariantId = character.customization.variantId ?? "blue";
  const currentAsset = getCharacterAsset(character.species, currentVariantId);

  return (
    <main className="auth-shell">
      <section className="auth-panel character-create-panel">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1 className="brand">캐릭터 옷장</h1>
          <p className="subtle">캐릭터 이름과 기본 색상을 바꿀 수 있어요.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <form className="character-create-form" action={updateWardrobe}>
          <div className="wardrobe-preview">
            <Image
              src={currentAsset.src}
              alt={`${character.display_name} 미리보기`}
              width={512}
              height={512}
            />
            <div>
              <p className="subtle">현재 캐릭터</p>
              <h2>{character.display_name}</h2>
              <p className="subtle">{character.species === "human" ? "인간" : "고양이"}</p>
            </div>
          </div>

          <label>
            이름
            <input
              name="displayName"
              defaultValue={character.display_name}
              maxLength={32}
              required
            />
          </label>

          <section>
            <h2>기본 색상</h2>
            <div className="color-choice-list">
              {CHARACTER_VARIANTS.map((variant) => (
                <label className="color-choice" key={variant.id}>
                  <input
                    name="variantId"
                    type="radio"
                    value={variant.id}
                    defaultChecked={variant.id === currentVariantId}
                  />
                  <span className="swatch" style={{ background: variant.color }} />
                  {variant.label}
                </label>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <Link className="ghost-button" href="/">
              돌아가기
            </Link>
            <button className="primary-button" type="submit">
              저장
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
