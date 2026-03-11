"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getTelegramInitDataRaw, initTelegramWebApp } from "@/lib/telegram";

type TelegramAuthBootstrapProps = {
  initialIsAuthenticated: boolean;
  hasSupabase: boolean;
  telegramDebug: boolean;
  telegramBotName: string | null;
};

const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 350;

export function TelegramAuthBootstrap({
  initialIsAuthenticated,
  hasSupabase,
  telegramDebug,
  telegramBotName
}: TelegramAuthBootstrapProps) {
  const router = useRouter();
  const [hasAttempted, setHasAttempted] = useState(initialIsAuthenticated);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  useEffect(() => {
    if (initialIsAuthenticated || hasAttempted || !hasSupabase) {
      return;
    }

    let isCancelled = false;
    let attempt = 0;
    let timeoutId: number | null = null;

    const authenticate = async (initData: string) => {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ initData })
      });

      setHasAttempted(true);

      if (!response.ok || isCancelled) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;

        if (telegramDebug && result?.error) {
          console.error("Telegram auth failed:", result.error);
        }

        return;
      }

      router.refresh();
    };

    const tryAuthenticate = () => {
      if (isCancelled) {
        return;
      }

      const initData = getTelegramInitDataRaw();

      if (initData) {
        void authenticate(initData);
        return;
      }

      attempt += 1;

      if (attempt >= MAX_ATTEMPTS) {
        setHasAttempted(true);

        if (telegramDebug) {
          console.warn("Telegram initData did not appear in WebApp context.");
        }

        return;
      }

      timeoutId = window.setTimeout(tryAuthenticate, RETRY_DELAY_MS);
    };

    tryAuthenticate();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [hasAttempted, hasSupabase, initialIsAuthenticated, router, telegramDebug]);

  return null;
}
