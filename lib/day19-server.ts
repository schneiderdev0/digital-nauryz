import type { Json } from "@/lib/database.types";
import {
  DAY19_EVENT_DAY,
  DAY19_REWARD_POINTS,
  DAY19_TREES,
  type Day19State,
  type Day19TreeId
} from "@/lib/day19";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/lib/supabase/queries";

async function getAuthenticatedUserId() {
  const client = await getSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  return user?.id ?? null;
}

export async function requireDay19UserId() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

function asMetadata(value: Json | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const metadata = value as Record<string, Json | undefined>;
  const treeId =
    typeof metadata.treeId === "string" &&
    DAY19_TREES.some((tree) => tree.id === metadata.treeId)
      ? (metadata.treeId as Day19TreeId)
      : DAY19_TREES[0].id;

  return {
    goal: typeof metadata.goal === "string" ? metadata.goal : "",
    treeId
  };
}

async function getParticipation(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("event_participation")
    .select("metadata, completed_at")
    .eq("user_id", userId)
    .eq("event_day", DAY19_EVENT_DAY)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function getProfile(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function hasRewardEvent(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("score_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_day", DAY19_EVENT_DAY)
    .eq("reason", "day19_tree_created")
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return Boolean(result.data);
}

export async function getDay19State(userId: string): Promise<Day19State> {
  const client = getSupabaseAdminClient();
  const [participation, profile, rewardGranted] = await Promise.all([
    getParticipation(client, userId),
    getProfile(client, userId),
    hasRewardEvent(client, userId)
  ]);
  const metadata = asMetadata(participation?.metadata ?? null);

  return {
    isAuthenticated: true,
    rewardPoints: DAY19_REWARD_POINTS,
    hasCreatedCard: rewardGranted,
    displayName: profile?.display_name ?? "Участник",
    goal: metadata?.goal ?? "",
    treeId: metadata?.treeId ?? DAY19_TREES[0].id,
    completedAt: participation?.completed_at ?? null
  };
}

export function getPublicDay19State(): Day19State {
  return {
    isAuthenticated: false,
    rewardPoints: DAY19_REWARD_POINTS,
    hasCreatedCard: false,
    displayName: null,
    goal: "",
    treeId: DAY19_TREES[0].id,
    completedAt: null
  };
}

export async function saveDay19Card(userId: string, goal: string, treeId: Day19TreeId) {
  const client = getSupabaseAdminClient();
  const sanitizedGoal = goal.trim().replace(/\s+/g, " ").slice(0, 180);

  if (!sanitizedGoal) {
    throw new Error("GOAL_REQUIRED");
  }

  const participation = await getParticipation(client, userId);
  const now = new Date().toISOString();

  const upsertResult = await client.from("event_participation").upsert(
    {
      user_id: userId,
      event_day: DAY19_EVENT_DAY,
      status: "completed",
      started_at: participation?.completed_at ?? now,
      completed_at: now,
      metadata: {
        goal: sanitizedGoal,
        treeId
      }
    },
    { onConflict: "user_id,event_day" }
  );

  if (upsertResult.error) {
    throw upsertResult.error;
  }

  const rewardGranted = await hasRewardEvent(client, userId);

  if (!rewardGranted) {
    const scoreResult = await client.from("score_events").insert({
      user_id: userId,
      event_day: DAY19_EVENT_DAY,
      reason: "day19_tree_created",
      points: DAY19_REWARD_POINTS,
      metadata: {
        treeId
      }
    });

    if (scoreResult.error) {
      throw scoreResult.error;
    }
  }

  return getDay19State(userId);
}
