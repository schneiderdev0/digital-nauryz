import Link from "next/link";

import type { AppLocale } from "@/lib/locale";
import { demoLeaderboard } from "@/lib/mock-data";

export function LeaderboardPreview({ locale }: { locale: AppLocale }) {
  const copy = locale === "kk"
    ? {
        title: "Көшбасшылар тақтасы",
        all: "Толық рейтинг",
        streak: "Белсенділік сериясы"
      }
    : {
        title: "Лидерборд",
        all: "Весь рейтинг",
        streak: "Серия активностей"
      };

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>{copy.title}</h2>
        <Link href="/leaderboard" style={{ color: "var(--accent-strong)" }}>
          {copy.all}
        </Link>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {demoLeaderboard.slice(0, 3).map((entry) => (
          <div
            key={entry.rank}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr auto",
              gap: 12,
              alignItems: "center",
              padding: 14,
              borderRadius: 18,
              background: "var(--surface-strong)",
              border: "1px solid var(--line)"
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "rgba(191, 93, 43, 0.12)",
                color: "var(--accent-strong)",
                fontWeight: 800
              }}
            >
              #{entry.rank}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{entry.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {copy.streak}: {entry.streak}
              </div>
            </div>
            <strong>{entry.score}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
