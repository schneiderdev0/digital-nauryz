import { AppShell } from "@/components/app-shell";
import { getRequestLocale, pickLocale } from "@/lib/locale";
import { demoLeaderboard } from "@/lib/mock-data";
import { env } from "@/lib/env";
import { getLeaderboard } from "@/lib/supabase/bootstrap";

export default async function LeaderboardPage() {
  const locale = await getRequestLocale();
  const leaderboard = env.hasSupabase
    ? await getLeaderboard().catch(() => null)
    : null;

  const entries =
    leaderboard?.map((entry, index) => ({
      rank: index + 1,
      name: entry.display_name,
      score: entry.score,
      streak: 0
    })) ?? demoLeaderboard;

  return (
    <AppShell
      locale={locale}
      eyebrow=""
      title={pickLocale(locale, {
        ru: "Общий рейтинг участников",
        kk: "Қатысушылардың жалпы рейтингі"
      })}
      description={pickLocale(locale, {
        ru: "Список топа пользователей с наибольшим количеством балов",
        kk: "Ең көп ұпай жинаған пайдаланушылар тізімі"
      })}
    >
      <section style={{ display: "grid", gap: 10, marginTop: -10 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-heading), serif",
            fontSize: 34,
            lineHeight: 1
          }}
        >
          {pickLocale(locale, {
            ru: "Лидеры Наурыза",
            kk: "Наурыз көшбасшылары"
          })}
        </h2>
        {entries.map((entry) => (
          <div
            key={entry.rank}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr auto",
              alignItems: "center",
              gap: 12,
              padding: 16,
              borderRadius: 18,
              background: "var(--surface-strong)",
              border: "1px solid var(--line)"
            }}
          >
            <strong>#{entry.rank}</strong>
            <div>
              <div style={{ fontWeight: 700 }}>{entry.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                {pickLocale(locale, {
                  ru: "Серия",
                  kk: "Серия"
                })}: {entry.streak}
              </div>
            </div>
            <strong>{entry.score}</strong>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
