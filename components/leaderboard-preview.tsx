import Link from "next/link";

import { demoLeaderboard } from "@/lib/mock-data";

export function LeaderboardPreview() {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Лидерборд</h2>
        <Link href="/leaderboard" style={{ color: "var(--accent-strong)" }}>
          Весь рейтинг
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
                Серия активностей: {entry.streak}
              </div>
            </div>
            <strong>{entry.score}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
