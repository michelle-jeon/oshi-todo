"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function searchUsers(query: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const keyword = query.trim();

  if (keyword.length < 2) {
    return [];
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .ilike("email", `%${keyword}%`)
    .neq("id", user.id)
    .limit(10);

  return data ?? [];
}

export async function followUser(userId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase.from("friendships").upsert({
    follower_id: user.id,
    following_id: userId
  });

  revalidatePath("/friends");
}

export async function unfollowUser(userId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("friendships")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", userId);

  revalidatePath("/friends");
}
