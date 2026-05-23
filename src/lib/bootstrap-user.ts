import { createClient } from "@/lib/supabase/server";

type BootstrapUserInput = {
  id: string;
  email?: string;
};

export async function ensureUserBootstrap(user: BootstrapUserInput) {
  const supabase = await createClient();
  const displayName = user.email?.split("@")[0] ?? "OshiTodo 유저";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName
    },
    { onConflict: "id" }
  );

  const { data: activeCharacter } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!activeCharacter) {
    await supabase.from("characters").insert({
      user_id: user.id,
      display_name: "첫 번째 친구",
      species: "human",
      is_active: true,
      customization: {
        species: "human",
        hairColor: "#5f3d2e",
        outfitColor: "#4f7cff"
      }
    });
  }
}
