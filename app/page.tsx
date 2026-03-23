import { AppShell } from "@/components/app-shell";
import { AuthStatusCardClient } from "@/components/auth-status-card-client";
import { EventGrid } from "@/components/event-grid";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getAuthState } from "@/lib/auth/server";
import { getEventDefinitions } from "@/lib/events";
import { getRequestLocale, pickLocale } from "@/lib/locale";

export default async function HomePage() {
  const locale = await getRequestLocale();
  const events = getEventDefinitions(locale);
  const authState = await getAuthState();
  const completionMessage = pickLocale(locale, {
    ru: 'Игра "Цифровой Наурыз" завершилась! С победителями игры скоро свяжутся.',
    kk: '"Цифрлық Наурыз" ойыны аяқталды! Ойын жеңімпаздарымен жақын арада хабарласамыз.'
  });

  return (
    <AppShell
      locale={locale}
      eyebrow=""
      title={pickLocale(locale, {
        ru: "Цифровой Наурыз",
        kk: "Цифрлық Наурыз"
      })}
      description=""
      titleAddon={
        <div
          style={{
            margin: "4px auto 0",
            maxWidth: 360,
            padding: "16px 18px",
            borderRadius: 18,
            background: "rgba(47, 122, 82, 0.14)",
            border: "1px solid rgba(47, 122, 82, 0.24)",
            color: "var(--success)",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.45,
            textAlign: "center"
          }}
        >
          {completionMessage}
        </div>
      }
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
