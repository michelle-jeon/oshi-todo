"use client";

import { UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/friend-actions";

type FriendProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type FriendTabsProps = {
  followingProfiles: FriendProfile[];
  followerProfiles: FriendProfile[];
  followingIds: string[];
};

export function FriendTabs({
  followingProfiles,
  followerProfiles,
  followingIds
}: FriendTabsProps) {
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");
  const [optimisticFollowingIds, setOptimisticFollowingIds] = useState(followingIds);
  const [, startTransition] = useTransition();
  const profiles = activeTab === "following" ? followingProfiles : followerProfiles;

  function handleFollow(userId: string) {
    setOptimisticFollowingIds((current) => [...new Set([...current, userId])]);
    startTransition(async () => {
      await followUser(userId);
    });
  }

  function handleUnfollow(userId: string) {
    setOptimisticFollowingIds((current) => current.filter((id) => id !== userId));
    startTransition(async () => {
      await unfollowUser(userId);
    });
  }

  return (
    <section className="panel friend-list-panel">
      <div className="friend-tabs">
        <button
          className={activeTab === "following" ? "selected" : ""}
          type="button"
          onClick={() => setActiveTab("following")}
        >
          팔로잉 {followingProfiles.length}
        </button>
        <button
          className={activeTab === "followers" ? "selected" : ""}
          type="button"
          onClick={() => setActiveTab("followers")}
        >
          팔로워 {followerProfiles.length}
        </button>
      </div>
      <div className="friend-result-list">
        {profiles.map((profile) => {
          const isFollowing = optimisticFollowingIds.includes(profile.id);

          return (
            <article className="friend-row" key={profile.id}>
              <div>
                <strong>{profile.display_name ?? "이름 없음"}</strong>
                <p className="subtle">{profile.email}</p>
              </div>
              <button
                className={isFollowing ? "ghost-button" : "primary-button"}
                type="button"
                onClick={() => (isFollowing ? handleUnfollow(profile.id) : handleFollow(profile.id))}
              >
                {isFollowing ? <X size={16} /> : <UserPlus size={16} />}
                {isFollowing ? "팔로잉" : "팔로우"}
              </button>
            </article>
          );
        })}
        {profiles.length === 0 ? <div className="empty-state">목록이 비어 있어요.</div> : null}
      </div>
    </section>
  );
}
