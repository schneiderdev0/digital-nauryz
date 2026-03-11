"use client";

import { useEffect, useState } from "react";

import type { ProfileRow } from "@/lib/auth/server";
import { getTelegramInitDataRaw } from "@/lib/telegram";

import { AuthStatusCard } from "@/components/auth-status-card";

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

  return <AuthStatusCard profile={profile} score={score} authPending={authPending} />;
}
