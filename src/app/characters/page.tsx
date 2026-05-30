import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Route } from "next";
import { selectCharacter } from "@/app/character-actions";
import {
  isCharacterOnboardingComplete,
  MAX_CHARACTER_SLOTS
} from "@/lib/character-onboarding";
import { getCharacterAsset, type CharacterSpecies } from "@/lib/character-assets";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type CharacterRow = {
  id: string;
  display_name: string;
  species: CharacterSpecies;
  level: number;
  xp_total: number;
  is_active: boolean;
  customization: Record<string, string>;
};

type CharactersPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function CharactersPage({ searchParams }: CharactersPageProps) {
  const user = await requireUser();
  const supabase = await createClient();
  const { message } = await searchParams;
  const { data: characters } = await supabase
    .from("characters")
    .select("id, display_name, species, level, xp_total, is_active, customization")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<CharacterRow[]>();
  const slots = Array.from({ length: MAX_CHARACTER_SLOTS }, (_, index) => characters?.[index] ?? null);

  return (
    <main className="auth-shell">
      <section className="auth-panel character-create-panel">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1 className="brand">캐릭터 선택</h1>
          <p className="subtle">최대 {MAX_CHARACTER_SLOTS}개의 캐릭터를 만들고 사용할 캐릭터를 선택하세요.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <div className="character-slot-grid">
          {slots.map((character, index) => {
            if (!character) {
              return (
                <Link
                  className="character-slot empty"
                  href={"/characters/new" as Route}
                  key={`empty-${index}`}
                >
                  <Plus size={28} />
                  <span>새 캐릭터</span>
                </Link>
              );
            }

            const asset = getCharacterAsset(character.species, character.customization.variantId);
            const needsSetup = !isCharacterOnboardingComplete(character);

            return (
              <form className="character-slot" action={selectCharacter} key={character.id}>
                <input name="characterId" type="hidden" value={character.id} />
                <div className="slot-avatar">
                  {asset.layers ? (
                    <div className="avatar-layer-stack slot-layer-stack">
                      {asset.layers.map((layer) => (
                        <Image
                          className="avatar-layer"
                          key={layer.id}
                          src={layer.src}
                          alt={layer.alt}
                          width={1024}
                          height={1024}
                        />
                      ))}
                    </div>
                  ) : (
                    <Image
                      className="avatar-image"
                      src={asset.src}
                      alt={character.display_name}
                      width={512}
                      height={512}
                    />
                  )}
                </div>
                <strong>{character.display_name}</strong>
                <span className="subtle">Lv. {character.level}</span>
                {needsSetup ? <span className="slot-badge">설정 필요</span> : null}
                <button className={character.is_active ? "primary-button" : "ghost-button"} type="submit">
                  {character.is_active ? "사용 중" : "선택"}
                </button>
              </form>
            );
          })}
        </div>

        <div className="form-actions">
          <Link className="ghost-button" href={"/" as Route}>
            홈으로
          </Link>
        </div>
      </section>
    </main>
  );
}
