import { cache } from "react";

import type { User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { fetchCurrentScore, fetchProfileById } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthState = {
  user: User | null;
  profile: ProfileRow | null;
  score: number;
};

export const getAuthState = cache(async (): Promise<AuthState> => {
  if (!env.hasSupabase) {
    return {
      user: null,
      profile: null,
      score: 0
    };
  }

  const client = await getSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      score: 0
    };
  }

  const [{ data: profile }, scoreResult] = await Promise.all([
    fetchProfileById(client, user.id),
    fetchCurrentScore(client, user.id)
  ]);

  return {
    user,
    profile: profile ?? null,
    score: scoreResult.data ?? 0
  };
});
