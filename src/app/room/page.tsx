import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { CharacterShowcase } from "@/components/character-showcase";
import { requireUser } from "@/lib/auth";
import type { CharacterSpecies } from "@/lib/character-assets";
import { STARTER_CHARACTER } from "@/lib/game-config";
import { createClient } from "@/lib/supabase/server";

type CharacterRow = {
  display_name: string;
  species: CharacterSpecies;
  customization: Record<string, string>;
};

export default async function RoomPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: character } = await supabase
    .from("characters")
    .select("display_name, species, customization")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<CharacterRow>();
  const currentCharacter = character ?? STARTER_CHARACTER;
  const displayName =
    "display_name" in currentCharacter ? currentCharacter.display_name : currentCharacter.displayName;

  return (
    <main className="simple-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <h1>캐릭터 방</h1>
      </header>
      <section className="room-stage">
        <div className="room-window" />
        <div className="room-rug" />
        <div className="room-desk" />
        <div className="room-avatar">
          <CharacterShowcase
            species={currentCharacter.species}
            customization={currentCharacter.customization}
          />
          <h2>{displayName}</h2>
        </div>
      </section>
    </main>
  );
}
