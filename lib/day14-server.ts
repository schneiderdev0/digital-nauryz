import { createHmac } from "node:crypto";

import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Day14MeetingState } from "@/lib/day14";
import type { AppSupabaseClient } from "@/lib/supabase/queries";

async function getAuthenticatedUserId() {
  const client = await getSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  return user?.id ?? null;
}

export async function requireDay14UserId() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

export async function getDay14MeetingState(userId: string): Promise<Day14MeetingState> {
  const adminClient = getSupabaseAdminClient();
  return loadDay14MeetingState(adminClient, userId);
}

export function getMeetingConfirmationCode(pairId: string, userId: string) {
  return createHmac("sha256", env.getTelegramAuthSecret())
    .update(`day14-confirm:${pairId}:${userId}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

export async function loadDay14MeetingState(
  client: AppSupabaseClient,
  userId: string
): Promise<Day14MeetingState> {
  const [pairResult, queueResult, participationResult] = await Promise.all([
    client
      .from("meeting_pairs")
      .select("id, pair_code, status, assigned_at, completed_at, user_a_id, user_b_id")
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .in("status", ["matched", "confirmed"])
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("meeting_queue")
      .select("user_id, joined_at")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("event_participation")
      .select("metadata")
      .eq("user_id", userId)
      .eq("event_day", 14)
      .maybeSingle()
  ]);

  const reassignmentsUsed = Number(
    ((participationResult.data?.metadata as { reassignments?: number } | null)?.reassignments ?? 0)
  );

  if (!pairResult.data) {
    return {
      isAuthenticated: true,
      isSearching: Boolean(queueResult.data),
      reassignmentsUsed,
      pair: null
    };
  }

  const pair = pairResult.data;
  const partnerId = pair.user_a_id === userId ? pair.user_b_id : pair.user_a_id;
  const [partnerResult, confirmationsResult] = await Promise.all([
    client
      .from("profiles")
      .select("id, display_name, telegram_username, avatar_url")
      .eq("id", partnerId)
      .single(),
    client
      .from("meeting_confirmations")
      .select("user_id")
      .eq("pair_id", pair.id)
  ]);

  if (partnerResult.error) {
    throw partnerResult.error;
  }

  if (confirmationsResult.error) {
    throw confirmationsResult.error;
  }

  return {
    isAuthenticated: true,
    isSearching: false,
    reassignmentsUsed,
    pair: {
      id: pair.id,
      pairCode: pair.pair_code,
      myConfirmationCode: getMeetingConfirmationCode(pair.id, userId),
      status: pair.status,
      assignedAt: pair.assigned_at,
      completedAt: pair.completed_at,
      partner: {
        id: partnerResult.data.id,
        displayName: partnerResult.data.display_name,
        telegramUsername: partnerResult.data.telegram_username,
        avatarUrl: partnerResult.data.avatar_url
      },
      confirmations: {
        total: confirmationsResult.data?.length ?? 0,
        isConfirmedByMe: Boolean(
          confirmationsResult.data?.some((confirmation) => confirmation.user_id === userId)
        )
      }
    }
  };
}
