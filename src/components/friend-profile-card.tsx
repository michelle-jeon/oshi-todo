"use client";

import { UserPlus, X } from "lucide-react";
import { CharacterShowcase } from "@/components/character-showcase";
import type { CharacterSpecies } from "@/lib/character-assets";

export type FriendProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  last_seen_at: string | null;
  character: {
    display_name: string;
    species: CharacterSpecies;
    level: number;
    customization: Record<string, string>;
  } | null;
};

type FriendProfileCardProps = {
  profile: FriendProfile;
  isFollowing: boolean;
  onFollow(): void;
  onUnfollow(): void;
};

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

export function FriendProfileCard({
  profile,
  isFollowing,
  onFollow,
  onUnfollow
}: FriendProfileCardProps) {
  const online = isOnline(profile.last_seen_at);

  return (
    <article className="friend-profile-card">
      <div className="friend-avatar-crop">
        {profile.character ? (
          <CharacterShowcase
            species={profile.character.species}
            customization={profile.character.customization}
          />
        ) : (
          <span className="friend-avatar-empty">캐릭터 없음</span>
        )}
      </div>
      <div className="friend-profile-main">
        <div>
          <strong>{profile.character?.display_name ?? profile.display_name ?? "이름 없음"}</strong>
          <p className="subtle">{profile.display_name ?? profile.email}</p>
        </div>
        <div className="friend-profile-meta">
          <span>Lv. {profile.character?.level ?? 1}</span>
          <span className={online ? "online" : "offline"}>
            <i aria-hidden="true" />
            {online ? "접속 중" : "오프라인"}
          </span>
        </div>
      </div>
      <button
        className={isFollowing ? "ghost-button" : "primary-button"}
        type="button"
        onClick={isFollowing ? onUnfollow : onFollow}
      >
        {isFollowing ? <X size={16} /> : <UserPlus size={16} />}
        {isFollowing ? "팔로잉" : "팔로우"}
      </button>
    </article>
  );
}
