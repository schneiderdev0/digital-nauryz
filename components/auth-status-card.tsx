import Link from "next/link";

import { env } from "@/lib/env";
import type { AppLocale } from "@/lib/locale";
import type { ProfileRow } from "@/lib/auth/server";

import { LoadingRing } from "@/components/loading-ring";

type AuthStatusCardProps = {
  locale?: AppLocale;
  profile: ProfileRow | null;
  score: number;
  authPending?: boolean;
};

export function AuthStatusCard({
  locale = "ru",
  profile,
  score,
  authPending = false
}: AuthStatusCardProps) {
  const copy =
    locale === "kk"
      ? {
          telegramConnected: "Telegram қосылған",
          points: "Ұпай",
          processingLabel: "Telegram аккаунтын өңдеп жатырмыз",
          processingTitle: "Telegram аккаунтын қосып жатырмыз",
          processingDescription:
            "Қосымша Telegram деректерін алып, сессияны көтеріп жатыр. Әдетте бұл бірнеше секунд алады.",
          signInTitle: "Telegram арқылы кіру",
          signInDescription:
            "Егер қосымша Telegram Web App ішінде ашылса, сессия автоматты түрде қосылады.",
          supabase: "Supabase",
          connected: "Қосылған",
          notConfigured: "Бапталмаған",
          bot: "Бот",
          notSpecified: "Көрсетілмеген",
          openViaTelegram: "Telegram арқылы ашу",
          botNameHint:
            "Пайдаланушыға ботқа тікелей сілтеме беру үшін `NEXT_PUBLIC_TELEGRAM_BOT_NAME` мәнін толтырыңыз."
        }
      : {
          telegramConnected: "Telegram подключен",
          points: "Очки",
          processingLabel: "Обрабатываем Telegram-аккаунт",
          processingTitle: "Подключаем Telegram-аккаунт",
          processingDescription:
            "Приложение получило данные Telegram и поднимает сессию. Обычно это занимает пару секунд.",
          signInTitle: "Вход через Telegram",
          signInDescription:
            "Если приложение открыто внутри Telegram Web App, сессия поднимется автоматически.",
          supabase: "Supabase",
          connected: "Подключен",
          notConfigured: "Не настроен",
          bot: "Бот",
          notSpecified: "Не указан",
          openViaTelegram: "Открыть через Telegram",
          botNameHint:
            "Заполните `NEXT_PUBLIC_TELEGRAM_BOT_NAME`, чтобы дать пользователю прямую ссылку на бота."
        };

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
              {profile.telegram_username ? `@${profile.telegram_username}` : copy.telegramConnected}
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
          <Metric label={copy.points} value={String(score)} />
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
        <LoadingRing size={46} locale={locale} label={copy.processingLabel} />
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 20 }}>{copy.processingTitle}</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            {copy.processingDescription}
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
        <strong style={{ fontSize: 20 }}>{copy.signInTitle}</strong>
        <span style={{ color: "var(--muted)" }}>
          {copy.signInDescription}
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <InfoRow label={copy.supabase} value={env.hasSupabase ? copy.connected : copy.notConfigured} />
        <InfoRow label={copy.bot} value={env.telegramBotName ? `@${env.telegramBotName}` : copy.notSpecified} />
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
          {copy.openViaTelegram}
        </a>
      ) : (
        <span style={{ color: "var(--muted)" }}>
          {copy.botNameHint}
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
