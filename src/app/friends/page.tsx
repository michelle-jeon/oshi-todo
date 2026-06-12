import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { FriendSearch } from "@/components/friend-search";
import { FriendTabs } from "@/components/friend-tabs";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type FriendshipRow = {
  follower_id: string;
  following_id: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  last_seen_at: string | null;
};

type CharacterRow = {
  user_id: string;
  display_name: string;
  species: "human" | "cat";
  level: number;
  customization: Record<string, string>;
};

async function loadProfiles(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const profileResult = await supabase
    .from("profiles")
    .select("id, display_name, email, last_seen_at")
    .in("id", ids)
    .returns<ProfileRow[]>();
  const fallbackProfileResult = profileResult.error
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids)
        .returns<Array<Omit<ProfileRow, "last_seen_at">>>()
    : null;
  const profiles = profileResult.data ??
    fallbackProfileResult?.data?.map((profile) => ({ ...profile, last_seen_at: null })) ??
    [];
  const characterResult = await supabase.rpc("get_friend_active_characters", {
    user_ids_input: ids
  });
  const characters = (characterResult.data ?? []) as CharacterRow[];
  const charactersByUserId = new Map(characters.map((character) => [character.user_id, character]));

  return profiles.map((profile) => ({
    ...profile,
    character: charactersByUserId.get(profile.id) ?? null
  }));
}

export default async function FriendsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: followingRows }, { data: followerRows }] = await Promise.all([
    supabase
      .from("friendships")
      .select("follower_id, following_id")
      .eq("follower_id", user.id)
      .returns<FriendshipRow[]>(),
    supabase
      .from("friendships")
      .select("follower_id, following_id")
      .eq("following_id", user.id)
      .returns<FriendshipRow[]>()
  ]);
  const followingIds = (followingRows ?? []).map((row) => row.following_id);
  const followerIds = (followerRows ?? []).map((row) => row.follower_id);
  const [followingProfiles, followerProfiles] = await Promise.all([
    loadProfiles(followingIds),
    loadProfiles(followerIds)
  ]);

  return (
    <main className="simple-shell">
      <header className="simple-header">
        <Link className="ghost-button" href={"/" as Route}>
          <ArrowLeft size={16} /> 홈
        </Link>
        <h1>친구</h1>
      </header>

      <div className="simple-stack">
        <FriendSearch followingIds={followingIds} />
        <FriendTabs
          followerProfiles={followerProfiles}
          followingIds={followingIds}
          followingProfiles={followingProfiles}
        />
      </div>
    </main>
  );
}
