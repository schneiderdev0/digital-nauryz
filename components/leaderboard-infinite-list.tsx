"use client";

import { useEffect, useRef, useState } from "react";

import { LoadingRing } from "@/components/loading-ring";
import type { AppLocale } from "@/lib/locale";
import type { LeaderboardEntry } from "@/lib/types";

const PAGE_SIZE = 20;

type LeaderboardInfiniteListProps = {
  initialEntries: LeaderboardEntry[];
  initialHasMore: boolean;
  locale: AppLocale;
};

export function LeaderboardInfiniteList({
  initialEntries,
  initialHasMore,
  locale
}: LeaderboardInfiniteListProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
    setHasMore(initialHasMore);
    setError(null);
  }, [initialEntries, initialHasMore]);

  useEffect(() => {
    if (!hasMore || loadingMore) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entriesList) => {
        const target = entriesList[0];
        if (target?.isIntersecting) {
          void loadMore();
        }
      },
      {
        rootMargin: "240px 0px"
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, entries.length]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leaderboard?offset=${entries.length}&limit=${PAGE_SIZE}`,
        { credentials: "same-origin" }
      );
      const payload = (await response.json().catch(() => null)) as
        | { entries?: LeaderboardEntry[]; hasMore?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.entries) {
        throw new Error(payload?.error ?? "LOAD_FAILED");
      }

      setEntries((current) => [...current, ...payload.entries!]);
      setHasMore(Boolean(payload.hasMore));
    } catch {
      setError(
        locale === "kk"
          ? "Рейтингтің келесі бөлігін жүктеу мүмкін болмады."
          : "Не удалось загрузить следующую часть рейтинга."
      );
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 10, marginTop: -10 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-heading), serif",
          fontSize: 34,
          lineHeight: 1
        }}
      >
        {locale === "kk" ? "Наурыз көшбасшылары" : "Лидеры Наурыза"}
      </h2>

      {entries.map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr auto",
            alignItems: "center",
            gap: 12,
            padding: 16,
            borderRadius: 18,
            background: "var(--surface-strong)",
            border: "1px solid var(--line)"
          }}
        >
          <strong>#{entry.rank}</strong>
          <div>
            <div style={{ fontWeight: 700 }}>{entry.name}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              {locale === "kk" ? "Серия" : "Серия"}: {entry.streak}
            </div>
          </div>
          <strong>{entry.score}</strong>
        </div>
      ))}

      {loadingMore ? (
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            padding: 18,
            borderRadius: 18,
            border: "1px solid var(--line)",
            background: "var(--surface-strong)"
          }}
        >
          <LoadingRing
            locale={locale}
            label={locale === "kk" ? "Рейтингті жүктеп жатырмыз" : "Загружаем рейтинг"}
            size={34}
          />
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid var(--line)",
            background: "rgba(179, 73, 16, 0.08)",
            color: "var(--text)"
          }}
        >
          {error}
        </div>
      ) : null}

      {hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
    </section>
  );
}
