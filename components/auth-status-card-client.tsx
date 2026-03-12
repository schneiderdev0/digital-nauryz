"use client";

import { useEffect, useState } from "react";

import type { ProfileRow } from "@/lib/auth/server";
import type { AppLocale } from "@/lib/locale";
import { getTelegramInitDataRaw } from "@/lib/telegram";

import { AuthStatusCard } from "@/components/auth-status-card";
import { LoadingRing } from "@/components/loading-ring";

type AuthStatusCardClientProps = {
  locale: AppLocale;
  profile: ProfileRow | null;
  score: number;
};

const MAX_PENDING_ATTEMPTS = 24;
const RETRY_DELAY_MS = 350;

export function AuthStatusCardClient({
  locale,
  profile,
  score
}: AuthStatusCardClientProps) {
  const [authPending, setAuthPending] = useState(Boolean(!profile));

  useEffect(() => {
    if (profile) {
      setAuthPending(false);
      return;
    }

    let isCancelled = false;
    let attempts = 0;
    let timeoutId: number | null = null;

    const detectPending = () => {
      if (isCancelled) {
        return;
      }

      const hasTelegramWebApp =
        typeof window !== "undefined" &&
        Boolean(
          (window as Window & {
            Telegram?: {
              WebApp?: unknown;
            };
          }).Telegram?.WebApp
        );
      const initData = getTelegramInitDataRaw();

      if (hasTelegramWebApp) {
        setAuthPending(true);
      }

      if (!hasTelegramWebApp && !initData) {
        setAuthPending(false);
        return;
      }

      attempts += 1;

      if (attempts >= MAX_PENDING_ATTEMPTS) {
        setAuthPending(false);
        return;
      }

      timeoutId = window.setTimeout(detectPending, RETRY_DELAY_MS);
    };

    detectPending();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [profile]);

  return (
    <>
      <AuthStatusCard locale={locale} profile={profile} score={score} authPending={false} />
      {authPending ? <TelegramAuthPendingModal locale={locale} /> : null}
    </>
  );
}

function TelegramAuthPendingModal({ locale }: { locale: AppLocale }) {
  const copy =
    locale === "kk"
      ? {
          label: "Telegram аккаунтын қосып жатырмыз",
          title: "Telegram аккаунтын қосып жатырмыз",
          description:
            "Бірнеше секунд күтіңіз. Біз Telegram деректерін өңдеп, басты экран ашылғанға дейін сессияны көтеріп жатырмыз."
        }
      : {
          label: "Подключаем Telegram-аккаунт",
          title: "Подключаем Telegram-аккаунт",
          description:
            "Подождите пару секунд. Мы обрабатываем данные Telegram и поднимаем сессию, прежде чем открыть главный экран."
        };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(248, 242, 232, 0.74)",
        backdropFilter: "blur(10px)"
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          display: "grid",
          gap: 14,
          padding: 22,
          borderRadius: 24,
          background: "rgba(255, 252, 246, 0.98)",
          border: "1px solid var(--line)",
          boxShadow: "0 20px 60px rgba(47, 28, 16, 0.12)",
          justifyItems: "center",
          textAlign: "center"
        }}
      >
        <LoadingRing size={52} locale={locale} label={copy.label} />
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 22 }}>{copy.title}</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            {copy.description}
          </span>
        </div>
      </div>
    </div>
  );
}
