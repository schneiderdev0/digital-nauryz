import { cache } from "react";

import { fetchLeaderboard, LeaderboardRow } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const getLeaderboard = cache(async (): Promise<LeaderboardRow[]> => {
  const client = await getSupabaseServerClient();
  const result = await fetchLeaderboard(client, 10);

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []) as LeaderboardRow[];
});
