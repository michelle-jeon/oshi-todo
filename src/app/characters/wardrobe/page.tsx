import { redirect } from "next/navigation";
import type { Route } from "next";
import { WardrobeEditor } from "@/components/wardrobe-editor";
import type { CharacterSpecies } from "@/lib/character-assets";
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

  return (
    <main className="auth-shell">
      <section className="auth-panel character-create-panel">
        <div>
          <p className="subtle">OshiTodo</p>
          <h1 className="brand">캐릭터 옷장</h1>
          <p className="subtle">아이템을 눌러 아바타에 바로 적용해보고 저장할 수 있어요.</p>
        </div>

        {message ? <p className="notice">{message}</p> : null}

        <WardrobeEditor
          character={{
            displayName: character.display_name,
            species: character.species,
            customization: character.customization
          }}
        />
      </section>
    </main>
  );
}
