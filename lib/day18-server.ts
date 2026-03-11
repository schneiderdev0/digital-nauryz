import type { Json } from "@/lib/database.types";
import { DAY18_EVENT_DAY, DAY18_OUTFITS, DAY18_REWARD_POINTS, type Day18OutfitId, type Day18State } from "@/lib/day18";
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

export async function requireDay18UserId() {
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
  return {
    captureCount: typeof metadata.captureCount === "number" ? metadata.captureCount : 0,
    lastOutfitId:
      typeof metadata.lastOutfitId === "string" &&
      DAY18_OUTFITS.some((outfit) => outfit.id === metadata.lastOutfitId)
        ? (metadata.lastOutfitId as Day18OutfitId)
        : null
  };
}

async function getParticipation(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("event_participation")
    .select("id, metadata, completed_at")
    .eq("user_id", userId)
    .eq("event_day", DAY18_EVENT_DAY)
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
    .eq("event_day", DAY18_EVENT_DAY)
    .eq("reason", "day18_first_photo")
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return Boolean(result.data);
}

export async function getDay18State(userId: string): Promise<Day18State> {
  const client = getSupabaseAdminClient();
  const [participation, rewardGranted] = await Promise.all([
    getParticipation(client, userId),
    hasRewardEvent(client, userId)
  ]);
  const metadata = asMetadata(participation?.metadata ?? null);

  return {
    isAuthenticated: true,
    rewardPoints: DAY18_REWARD_POINTS,
    hasCapturedFirstPhoto: rewardGranted,
    captureCount: metadata?.captureCount ?? 0,
    lastOutfitId: metadata?.lastOutfitId ?? null,
    completedAt: participation?.completed_at ?? null
  };
}

export function getPublicDay18State(): Day18State {
  return {
    isAuthenticated: false,
    rewardPoints: DAY18_REWARD_POINTS,
    hasCapturedFirstPhoto: false,
    captureCount: 0,
    lastOutfitId: null,
    completedAt: null
  };
}

export async function registerDay18Capture(userId: string, outfitId: Day18OutfitId) {
  const client = getSupabaseAdminClient();
  const participation = await getParticipation(client, userId);
  const metadata = asMetadata(participation?.metadata ?? null);
  const nextCaptureCount = (metadata?.captureCount ?? 0) + 1;
  const completedAt = participation?.completed_at ?? new Date().toISOString();

  const upsertResult = await client
    .from("event_participation")
    .upsert(
      {
        user_id: userId,
        event_day: DAY18_EVENT_DAY,
        status: "completed",
        started_at: participation?.completed_at ?? new Date().toISOString(),
        completed_at: completedAt,
        metadata: {
          captureCount: nextCaptureCount,
          lastOutfitId: outfitId
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
      event_day: DAY18_EVENT_DAY,
      reason: "day18_first_photo",
      points: DAY18_REWARD_POINTS,
      metadata: {
        outfitId,
        captureCount: nextCaptureCount
      }
    });

    if (scoreResult.error) {
      throw scoreResult.error;
    }
  }

  return getDay18State(userId);
}
