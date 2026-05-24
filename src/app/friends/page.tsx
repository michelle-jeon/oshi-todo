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
};

async function loadProfiles(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", ids)
    .returns<ProfileRow[]>();

  return data ?? [];
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
