"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { followUser, searchUsers, unfollowUser } from "@/app/friend-actions";

type FriendSearchResult = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type FriendSearchProps = {
  followingIds: string[];
};

export function FriendSearch({ followingIds }: FriendSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [optimisticFollowingIds, setOptimisticFollowingIds] = useState(followingIds);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      setResults((await searchUsers(value)) as FriendSearchResult[]);
    });
  }

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
    <section className="panel friend-search-panel">
      <h2>친구 찾기</h2>
      <label className="search-field">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="이메일로 검색"
          aria-label="친구 이메일 검색"
        />
      </label>
      <div className="friend-result-list" aria-busy={isPending}>
        {results.map((result) => {
          const isFollowing = optimisticFollowingIds.includes(result.id);

          return (
            <article className="friend-row" key={result.id}>
              <div>
                <strong>{result.display_name ?? result.email ?? "이름 없음"}</strong>
                <p className="subtle">{result.email}</p>
              </div>
              <button
                className={isFollowing ? "ghost-button" : "primary-button"}
                type="button"
                onClick={() => (isFollowing ? handleUnfollow(result.id) : handleFollow(result.id))}
              >
                {isFollowing ? <X size={16} /> : <UserPlus size={16} />}
                {isFollowing ? "팔로잉" : "팔로우"}
              </button>
            </article>
          );
        })}
        {query.trim().length >= 2 && results.length === 0 && !isPending ? (
          <div className="empty-state">검색 결과가 없어요.</div>
        ) : null}
      </div>
    </section>
  );
}
