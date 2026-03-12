"use client";

import { useEffect, useState } from "react";

import type { ProfileRow } from "@/lib/auth/server";
import { getTelegramInitDataRaw } from "@/lib/telegram";

import { AuthStatusCard } from "@/components/auth-status-card";
import { LoadingRing } from "@/components/loading-ring";

type AuthStatusCardClientProps = {
  profile: ProfileRow | null;
  score: number;
};

const MAX_PENDING_ATTEMPTS = 24;
const RETRY_DELAY_MS = 350;

export function AuthStatusCardClient({
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
      <AuthStatusCard profile={profile} score={score} authPending={false} />
      {authPending ? <TelegramAuthPendingModal /> : null}
    </>
  );
}

function TelegramAuthPendingModal() {
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
        <LoadingRing size={52} label="Подключаем Telegram-аккаунт" />
        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 22 }}>Подключаем Telegram-аккаунт</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            Подождите пару секунд. Мы обрабатываем данные Telegram и поднимаем сессию,
            прежде чем открыть главный экран.
          </span>
        </div>
      </div>
    </div>
  );
}
