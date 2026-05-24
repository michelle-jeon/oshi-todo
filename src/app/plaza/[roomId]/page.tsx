import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { PlazaClient } from "@/components/plaza-client";
import { requireUser } from "@/lib/auth";
import type { CharacterSpecies } from "@/lib/character-assets";
import { createClient } from "@/lib/supabase/server";

type RoomRow = {
  id: string;
  name: string;
  visibility: "private" | "public";
};

type CharacterRow = {
  display_name: string;
  species: CharacterSpecies;
};

export default async function PlazaRoomPage({
  params
}: {
  params: Promise<{ roomId: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { roomId } = await params;
  const [{ data: room }, { data: character }] = await Promise.all([
    supabase
      .from("plaza_rooms")
      .select("id, name, visibility")
      .eq("id", roomId)
      .maybeSingle<RoomRow>(),
    supabase
      .from("characters")
      .select("display_name, species")
      .eq("is_active", true)
      .maybeSingle<CharacterRow>()
  ]);

  if (!room) {
    notFound();
  }

  const avatarLabel = character?.species === "cat" ? "냥" : "오";

  return (
    <main className="simple-shell plaza-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/plaza" as Route}>
          <ArrowLeft size={16} /> 광장 목록
        </Link>
        <div>
          <h1>{room.name}</h1>
          <p className="subtle">{room.visibility === "public" ? "공개 광장" : "비밀 광장"}</p>
        </div>
      </header>
      <PlazaClient
        avatarLabel={avatarLabel}
        displayName={character?.display_name ?? user.email?.split("@")[0] ?? "나"}
        roomId={room.id}
        userId={user.id}
      />
    </main>
  );
}
