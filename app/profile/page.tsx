import { AppShell } from "@/components/app-shell";
import { AuthStatusCard } from "@/components/auth-status-card";
import { getAuthState } from "@/lib/auth/server";
import { getRequestLocale, pickLocale } from "@/lib/locale";

export default async function ProfilePage() {
  const locale = await getRequestLocale();
  const authState = await getAuthState();

  return (
    <AppShell
      locale={locale}
      eyebrow=""
      title={pickLocale(locale, {
        ru: "Профиль",
        kk: "Профиль"
      })}
      description=""
    >
      <AuthStatusCard locale={locale} profile={authState.profile} score={authState.score} />

      {authState.profile ? (
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
          <InfoRow
            label={pickLocale(locale, { ru: "Telegram", kk: "Telegram" })}
            value={
              authState.profile.telegram_username
                ? `@${authState.profile.telegram_username}`
                : pickLocale(locale, { ru: "username не указан", kk: "username көрсетілмеген" })
            }
          />
          <InfoRow
            label={pickLocale(locale, { ru: "Telegram ID", kk: "Telegram ID" })}
            value={String(authState.profile.telegram_user_id ?? pickLocale(locale, { ru: "Не указан", kk: "Көрсетілмеген" }))}
          />
          <InfoRow label={pickLocale(locale, { ru: "Очки", kk: "Ұпай" })} value={String(authState.score)} />
          {/* <InfoRow
            label="Аватар"
            value={authState.profile.avatar_url ? "Получен из Telegram" : "Пока отсутствует"}
          /> */}
        </section>
      ) : null}
    </AppShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 12,
        borderBottom: "1px solid var(--line)"
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
