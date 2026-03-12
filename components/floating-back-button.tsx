"use client";

import { useRouter } from "next/navigation";
import type { AppLocale } from "@/lib/locale";

export function FloatingBackButton({ locale = "ru" }: { locale?: AppLocale }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label={locale === "kk" ? "Артқа" : "Назад"}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/");
      }}
      style={{
        position: "fixed",
        left: 16,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        width: 54,
        height: 54,
        borderRadius: 999,
        border: "1px solid rgba(57, 34, 16, 0.12)",
        background: "rgba(255, 255, 255, 0.94)",
        color: "var(--text)",
        display: "grid",
        placeItems: "center",
        boxShadow: "0 16px 36px rgba(30, 16, 10, 0.14)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 40,
        cursor: "pointer"
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: 20,
          height: 20,
          display: "block"
        }}
      >
        <path
          d="M12.5 3.75L6.25 10L12.5 16.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
