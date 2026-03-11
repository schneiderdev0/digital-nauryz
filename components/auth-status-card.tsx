import Link from "next/link";

import { env } from "@/lib/env";
import type { ProfileRow } from "@/lib/auth/server";

import { LoadingRing } from "@/components/loading-ring";

type AuthStatusCardProps = {
  profile: ProfileRow | null;
  score: number;
  authPending?: boolean;
};

export function AuthStatusCard({
  profile,
  score,
  authPending = false
}: AuthStatusCardProps) {
  const botLink = env.telegramBotName
    ? `https://t.me/${env.telegramBotName}?startapp=nauryz`
    : null;

  if (profile) {
    return (
      <section
        style={{
          display: "grid",
          gap: 14,
          padding: 18,
          borderRadius: 22,
          background: "linear-gradient(135deg, rgba(244, 209, 122, 0.42), rgba(255, 248, 234, 0.96))",
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
            {profile.display_name.slice(0, 1)}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: 20 }}>{profile.display_name}</strong>
            <span style={{ color: "var(--muted)" }}>
              {profile.telegram_username ? `@${profile.telegram_username}` : "Telegram подключен"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
            gap: 10
          }}
        >
          <Metric label="Очки" value={String(score)} />
          {/* <Metric label="Telegram ID" value={String(profile.telegram_user_id ?? "n/a")} />
          <Metric label="Статус" value="Авторизован" /> */}
        </div>

        {/* <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/profile"
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              background: "var(--accent-strong)",
              color: "white"
            }}
          >
            Открыть профиль
          </Link>
          <LogoutButton />
        </div> */}
      </section>
    );
  }

  if (authPending) {
    return (
      <section
        style={{
          display: "grid",
          gap: 14,
          padding: 18,
          borderRadius: 22,
          background: "var(--surface-strong)",
          border: "1px solid var(--line)",
          justifyItems: "center",
          textAlign: "center"
        }}
      >
        <LoadingRing size={46} label="Обрабатываем Telegram-аккаунт" />
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>Подключаем Telegram-аккаунт</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Приложение получило данные Telegram и поднимает сессию. Обычно это занимает пару секунд.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 12,
        padding: 18,
        borderRadius: 22,
        background: "var(--surface-strong)",
        border: "1px solid var(--line)"
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <strong style={{ fontSize: 20 }}>Вход через Telegram</strong>
        <span style={{ color: "var(--muted)" }}>
          Если приложение открыто внутри Telegram Web App, сессия поднимется автоматически.
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <InfoRow label="Supabase" value={env.hasSupabase ? "Подключен" : "Не настроен"} />
        <InfoRow label="Бот" value={env.telegramBotName ? `@${env.telegramBotName}` : "Не указан"} />
      </div>

      {botLink ? (
        <a
          href={botLink}
          target="_blank"
          rel="noreferrer"
          style={{
            justifySelf: "start",
            padding: "10px 14px",
            borderRadius: 14,
            background: "var(--accent-strong)",
            color: "white"
          }}
        >
          Открыть через Telegram
        </a>
      ) : (
        <span style={{ color: "var(--muted)" }}>
          Заполните `NEXT_PUBLIC_TELEGRAM_BOT_NAME`, чтобы дать пользователю прямую ссылку на бота.
        </span>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: "rgba(255, 255, 255, 0.6)",
        border: "1px solid rgba(79, 45, 24, 0.08)"
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 700, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}
