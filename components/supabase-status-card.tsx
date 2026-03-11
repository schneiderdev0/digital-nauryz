import { env } from "@/lib/env";

export function SupabaseStatusCard() {
  return (
    <section
      style={{
        display: "grid",
        gap: 10,
        padding: 18,
        borderRadius: 22,
        border: "1px solid var(--line)",
        background: "var(--surface-strong)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Supabase</h2>
        <strong style={{ color: env.hasSupabase ? "var(--success)" : "var(--muted)" }}>
          {env.hasSupabase ? "Подключён" : "Не настроен"}
        </strong>
      </div>
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
        Подготовлены SSR-клиенты, middleware, SQL-миграция и базовые запросы для
        профиля, очков и лидерборда. Проект рассчитан на внешний Supabase, локальный
        self-hosted стек больше не обязателен.
      </p>
      <div style={{ display: "grid", gap: 6, color: "var(--muted)", fontSize: 14 }}>
        <span>
          `NEXT_PUBLIC_SUPABASE_URL`: {env.supabaseUrl ? "ok" : "missing"}
        </span>
        <span>
          `SUPABASE_INTERNAL_URL`: {env.supabaseInternalUrl ? "ok" : "optional for cloud"}
        </span>
        <span>
          `NEXT_PUBLIC_SUPABASE_ANON_KEY`: {env.supabaseAnonKey ? "ok" : "missing"}
        </span>
        <span>
          `SUPABASE_SERVICE_ROLE_KEY`: {env.serviceRoleKey ? "ok" : "required for Telegram auth"}
        </span>
      </div>
    </section>
  );
}
