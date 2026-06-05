"use client";

import { Coins } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  loadXpLedgerPage,
  type XpLedgerCursor,
  type XpLedgerItem,
  type XpLedgerPage
} from "@/app/profile/xp/actions";

type XpLedgerListProps = {
  initialPage: XpLedgerPage;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function XpLedgerList({ initialPage }: XpLedgerListProps) {
  const [items, setItems] = useState<XpLedgerItem[]>(initialPage.items);
  const [cursor, setCursor] = useState<XpLedgerCursor>(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const nextPage = await loadXpLedgerPage(cursor);

        setItems((current) => [...current, ...nextPage.items]);
        setCursor(nextPage.nextCursor);
        setHasMore(nextPage.hasMore);
      } catch {
        setErrorMessage("기록을 불러오지 못했어요.");
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    });
  }, [cursor, hasMore, startTransition]);

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
    <div className="xp-ledger-list">
      {items.map((item) => (
        <article className="xp-ledger-row" key={item.id}>
          <span className={`xp-ledger-icon ${item.type}`}>
            <Coins size={16} />
          </span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <span className="subtle">{formatDateTime(item.createdAt)}</span>
          </div>
          <strong className={item.type === "gain" ? "xp-gain" : "xp-spend"}>
            {item.type === "gain" ? "+" : "-"}
            {item.amount.toLocaleString()} XP
          </strong>
        </article>
      ))}

      {items.length === 0 ? <div className="empty-state">XP 기록이 아직 없어요.</div> : null}
      {errorMessage ? <p className="notice compact-notice">{errorMessage}</p> : null}
      <div className="xp-ledger-sentinel" ref={sentinelRef} aria-hidden="true" />
      {hasMore ? (
        <button
          className="ghost-button xp-ledger-more-button"
          type="button"
          onClick={loadMore}
          disabled={isLoading || isPending}
        >
          {isLoading || isPending ? "불러오는 중" : "더 보기"}
        </button>
      ) : null}
    </div>
  );
}
