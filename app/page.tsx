import { AppShell } from "@/components/app-shell";
import { AuthStatusCardClient } from "@/components/auth-status-card-client";
import { EventGrid } from "@/components/event-grid";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NextEventCountdown } from "@/components/next-event-countdown";
import { getAuthState } from "@/lib/auth/server";
import { getEventDefinitions } from "@/lib/events";
import { getRequestLocale, pickLocale } from "@/lib/locale";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const events = getEventDefinitions(locale);
  const authState = await getAuthState();

  return (
    <AppShell
      locale={locale}
      eyebrow=""
      title={pickLocale(locale, {
        ru: "Цифровой Наурыз",
        kk: "Цифрлық Наурыз"
      })}
      titleAddon={<NextEventCountdown locale={locale} />}
      description=""
    >
      <AuthStatusCardClient locale={locale} profile={authState.profile} score={authState.score} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto minmax(0, 1fr)",
          alignItems: "center",
          gap: 12
        }}
      >
        <LocaleSwitcher locale={locale} />
        <a
          href="https://www.instagram.com/titan.tou/"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 52,
            padding: "0 18px",
            borderRadius: 18,
            background: "var(--accent-strong)",
            color: "white",
            fontWeight: 600,
            textAlign: "center",
            whiteSpace: "normal"
          }}
        >
          {locale === "kk" ? "Біздің Instagram-ға өту" : "Перейти в наш Instagram"}
        </a>
      </div>
      <EventGrid locale={locale} events={events} />
    </AppShell>
  );
}
