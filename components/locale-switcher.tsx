"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { APP_LOCALE_COOKIE, type AppLocale } from "@/lib/locale-core";

export function LocaleSwitcher({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);

  const setLocale = async (nextLocale: AppLocale) => {
    if (nextLocale === locale || pendingLocale) {
      return;
    }

    setPendingLocale(nextLocale);

    try {
      document.cookie = `${APP_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingLocale(null);
    }
  };

  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 8,
        padding: 6,
        borderRadius: 18,
        border: "1px solid var(--line)",
        background: "var(--surface-strong)"
      }}
    >
      {(["ru", "kk"] as const).map((item) => {
        const active = locale === item;
        const disabled = Boolean(pendingLocale);

        return (
          <button
            key={item}
            type="button"
            onClick={() => void setLocale(item)}
            disabled={disabled}
            style={{
              minWidth: 68,
              minHeight: 40,
              padding: "0 14px",
              borderRadius: 14,
              border: active ? "none" : "1px solid transparent",
              background: active ? "var(--accent-strong)" : "transparent",
              color: active ? "white" : "var(--text)",
              fontWeight: 700,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.72 : 1
            }}
          >
            {item.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
