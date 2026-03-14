import { AppShell } from "@/components/app-shell";
import { LeaderboardInfiniteList } from "@/components/leaderboard-infinite-list";
import { getRequestLocale, pickLocale } from "@/lib/locale";
import { demoLeaderboard } from "@/lib/mock-data";
import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchLeaderboard } from "@/lib/supabase/queries";

const LEADERBOARD_PAGE_SIZE = 20;

export default async function LeaderboardPage() {
  const locale = await getRequestLocale();
  let entries = demoLeaderboard;
  let initialHasMore = false;

  if (env.hasSupabase) {
    try {
      const client = await getSupabaseServerClient();
      const result = await fetchLeaderboard(client, LEADERBOARD_PAGE_SIZE + 1, 0);

      if (!result.error) {
        const rows = result.data ?? [];
        initialHasMore = rows.length > LEADERBOARD_PAGE_SIZE;
        entries = rows.slice(0, LEADERBOARD_PAGE_SIZE).map((entry, index) => ({
          rank: index + 1,
          name: entry.display_name,
          score: entry.score,
          streak: 0
        }));
      }
    } catch {
      void 0;
    }
  }

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
      <LeaderboardInfiniteList
        initialEntries={entries}
        initialHasMore={initialHasMore}
        locale={locale}
      />
    </AppShell>
  );
}
