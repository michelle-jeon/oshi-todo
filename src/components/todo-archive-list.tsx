"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  loadTodoArchivePage,
  type ArchivedTodoItem,
  type TodoArchivePageData
} from "@/app/todos/archive/actions";

type TodoArchiveListProps = {
  initialPage: TodoArchivePageData;
};

function formatDate(value: string | null) {
  if (!value) {
    return "완료일 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(value));
}

export function TodoArchiveList({ initialPage }: TodoArchiveListProps) {
  const [items, setItems] = useState<ArchivedTodoItem[]>(initialPage.items);
  const [nextOffset, setNextOffset] = useState(initialPage.nextOffset);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);

  const shownXp = items.reduce((sum, todo) => sum + todo.xpReward, 0);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const nextPage = await loadTodoArchivePage(nextOffset);

        setItems((current) => [...current, ...nextPage.items]);
        setNextOffset(nextPage.nextOffset);
        setHasMore(nextPage.hasMore);
      } catch {
        setErrorMessage("완료 기록을 불러오지 못했어요.");
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    });
  }, [hasMore, nextOffset, startTransition]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "160px 0px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <p className="subtle archive-summary">
        {initialPage.totalCount?.toLocaleString() ?? items.length.toLocaleString()}개 완료 · 표시된{" "}
        {shownXp.toLocaleString()} XP
      </p>
      <section className="panel archive-panel">
        <div className="archive-list">
          {items.map((todo) => (
            <article className="archive-row" key={todo.id}>
              <span className="archive-icon">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <strong>{todo.title}</strong>
                <p className="subtle">{formatDate(todo.completedAt)}</p>
              </div>
              <strong>{todo.xpReward} XP</strong>
            </article>
          ))}
          {items.length === 0 ? (
            <div className="empty-state">아직 완료한 투두가 없어요.</div>
          ) : null}
          {errorMessage ? <p className="notice compact-notice">{errorMessage}</p> : null}
          <div className="archive-sentinel" ref={sentinelRef} aria-hidden="true" />
          {hasMore ? (
            <button
              className="ghost-button archive-more-button"
              type="button"
              onClick={loadMore}
              disabled={isLoading || isPending}
            >
              {isLoading || isPending ? "불러오는 중" : "더 보기"}
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}
