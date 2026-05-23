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
}
