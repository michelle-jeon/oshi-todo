"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/friend-actions";
import { FriendProfileCard, type FriendProfile } from "@/components/friend-profile-card";

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
            <FriendProfileCard
              profile={profile}
              isFollowing={isFollowing}
              key={profile.id}
              onFollow={() => handleFollow(profile.id)}
              onUnfollow={() => handleUnfollow(profile.id)}
            />
          );
        })}
        {profiles.length === 0 ? <div className="empty-state">목록이 비어 있어요.</div> : null}
      </div>
    </section>
  );
}
