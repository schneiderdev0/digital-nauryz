import { AppShell } from "@/components/app-shell";
import { AuthStatusCard } from "@/components/auth-status-card";
import { PageIntro } from "@/components/page-intro";
import { getAuthState } from "@/lib/auth/server";

export default async function ProfilePage() {
  const authState = await getAuthState();

  return (
    <AppShell
      eyebrow=""
      title="Профиль"
      description=""
    >
      {/* <PageIntro
        eyebrow="Данные пользователя"
        title=""
        description=""
      /> */}

      <AuthStatusCard profile={authState.profile} score={authState.score} />

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
            label="Telegram"
            value={
              authState.profile.telegram_username
                ? `@${authState.profile.telegram_username}`
                : "username не указан"
            }
          />
          <InfoRow
            label="Telegram ID"
            value={String(authState.profile.telegram_user_id ?? "Не указан")}
          />
          <InfoRow label="Очки" value={String(authState.score)} />
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
