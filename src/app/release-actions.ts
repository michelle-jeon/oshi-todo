"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { LATEST_RELEASE_NOTE } from "@/lib/release-notes";
import { createClient } from "@/lib/supabase/server";

export async function acknowledgeLatestRelease() {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("profiles")
    .update({ last_seen_release_version: LATEST_RELEASE_NOTE.version })
    .eq("id", user.id);

  revalidatePath("/");
}
