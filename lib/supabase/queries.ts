import type { SupabaseClient } from "@supabase/supabase-js";

import { Database } from "@/lib/database.types";

export type AppSupabaseClient = SupabaseClient<Database, "public">;

export type LeaderboardRow =
  Database["public"]["Views"]["leaderboard"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function fetchLeaderboard(client: AppSupabaseClient, limit = 10) {
  return client
    .from("leaderboard")
    .select("user_id, display_name, telegram_username, score")
    .order("score", { ascending: false })
    .limit(limit);
}

export async function fetchProfileById(
  client: AppSupabaseClient,
  profileId: string
){
  return client
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();
}

export async function fetchProfileByTelegramUserId(
  client: AppSupabaseClient,
  telegramUserId: number
) {
  return client
    .from("profiles")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
}

export async function fetchCurrentScore(
  client: AppSupabaseClient,
  profileId: string
) {
  return client.rpc("get_current_score", {
    profile_id: profileId
  });
}

export async function upsertProfile(
  client: AppSupabaseClient,
  profile: Database["public"]["Tables"]["profiles"]["Insert"]
) {
  return client
    .from("profiles")
    .upsert(profile)
    .select("*")
    .single();
}
