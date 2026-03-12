import Link from "next/link";
import type { Route } from "next";

import type { AppLocale } from "@/lib/locale";
import { EventDefinition } from "@/lib/types";

export function EventGrid({
  events,
  locale
}: {
  events: EventDefinition[];
  locale: AppLocale;
}) {
  const copy = locale === "kk"
    ? {
        title: "Күндер бойынша белсенділіктер",
        dateRange: "14-20 наурыз"
      }
    : {
        title: "Активности по дням",
        dateRange: "14-20 марта"
      };

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
        <h2 style={{ margin: 0, fontSize: 22 }}>{copy.title}</h2>
        <span style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1 }}>{copy.dateRange}</span>
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
              <StatusChip locale={locale} status={event.status} />
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

function StatusChip({
  status,
  locale
}: {
  status: EventDefinition["status"];
  locale: AppLocale;
}) {
  const labels =
    locale === "kk"
      ? {
          upcoming: "Жақында",
          active: "Ашық",
          completed: "Аяқталды"
        }
      : {
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
