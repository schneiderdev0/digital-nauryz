import Link from "next/link";

import { demoProfile } from "@/lib/mock-data";

export function ProfileCard() {
  return (
    <section
      style={{
        display: "grid",
        gap: 14,
        padding: 18,
        borderRadius: 22,
        background: "linear-gradient(135deg, rgba(244, 209, 122, 0.45), rgba(255, 248, 234, 0.95))",
        border: "1px solid var(--line)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "var(--accent)",
            color: "white",
            fontSize: 22,
            fontWeight: 700
          }}
        >
          {demoProfile.name.slice(0, 1)}
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={{ fontSize: 20 }}>{demoProfile.name}</strong>
          <span style={{ color: "var(--muted)" }}>
            @{demoProfile.telegramUsername}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10
        }}
      >
        <Metric label="Очки" value={String(demoProfile.score)} />
        <Metric label="Город" value={demoProfile.city ?? "Алматы"} />
        <Metric label="Статус" value="Участник" />
      </div>

      <Link
        href="/profile"
        style={{
          justifySelf: "start",
          padding: "10px 14px",
          borderRadius: 14,
          background: "var(--accent-strong)",
          color: "white"
        }}
      >
        Открыть профиль
      </Link>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.55)",
        border: "1px solid rgba(79, 45, 24, 0.08)"
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
