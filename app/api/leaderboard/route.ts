import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchLeaderboard } from "@/lib/supabase/queries";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  if (!env.hasSupabase) {
    return NextResponse.json({ entries: [], hasMore: false });
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const requestedLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(MAX_LIMIT, requestedLimit));

  try {
    const client = await getSupabaseServerClient();
    const result = await fetchLeaderboard(client, limit + 1, offset);

    if (result.error) {
      throw result.error;
    }

    const rows = result.data ?? [];
    const hasMore = rows.length > limit;
    const entries = rows.slice(0, limit).map((entry, index) => ({
      rank: offset + index + 1,
      name: entry.display_name,
      score: entry.score,
      streak: 0
    }));

    return NextResponse.json({ entries, hasMore });
  } catch (error) {
    console.error("Leaderboard route failed:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard." },
      { status: 500 }
    );
  }
}
