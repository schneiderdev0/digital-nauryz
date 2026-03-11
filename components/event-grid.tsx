import Link from "next/link";
import type { Route } from "next";

import { EventDefinition } from "@/lib/types";

export function EventGrid({ events }: { events: EventDefinition[] }) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22 }}>Активности по дням</h2>
        <span style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1 }}>14-20 марта</span>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {events.map((event) => (
          <Link
            key={event.slug}
            href={`/events/${event.slug}` as Route}
            style={{
              display: "grid",
              gap: 10,
              padding: 16,
              borderRadius: 20,
              border: "1px solid var(--line)",
              background: "var(--surface-strong)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong>{event.dateLabel}</strong>
              <StatusChip status={event.status} />
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 20 }}>{event.title}</h3>
              <p style={{ margin: 0, color: "var(--muted)" }}>{event.subtitle}</p>
              <p style={{ margin: 0, lineHeight: 1.45 }}>{event.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatusChip({ status }: { status: EventDefinition["status"] }) {
  const labels = {
    upcoming: "Скоро",
    active: "Открыто",
    completed: "Завершено"
  };

  const colors = {
    upcoming: "rgba(77, 45, 24, 0.08)",
    active: "rgba(47, 122, 82, 0.14)",
    completed: "rgba(79, 45, 24, 0.08)"
  };

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: colors[status],
        color: status === "active" ? "var(--success)" : "var(--muted)",
        fontSize: 12
      }}
    >
      {labels[status]}
    </span>
  );
}
