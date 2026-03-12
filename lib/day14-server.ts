import { createHmac } from "node:crypto";

import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Day14ChatMessage, Day14MeetingState } from "@/lib/day14";
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

export function getMeetingQrPayload(pairId: string, userId: string) {
  const code = getMeetingConfirmationCode(pairId, userId);
  return `digital-nauryz://day14-confirm?pairId=${encodeURIComponent(pairId)}&code=${encodeURIComponent(code)}`;
}

export function extractDay14QrData(rawValue: string) {
  const trimmed = rawValue.trim();

  try {
    const parsed = new URL(trimmed);
    const pairId = parsed.searchParams.get("pairId");
    const partnerCode = parsed.searchParams.get("code");

    return {
      pairId: pairId?.trim() ?? null,
      partnerCode: partnerCode?.trim().toUpperCase() ?? null
    };
  } catch {
    return {
      pairId: null,
      partnerCode: trimmed.toUpperCase()
    };
  }
}

async function getOwnedPair(
  client: AppSupabaseClient,
  pairId: string,
  userId: string
) {
  const result = await client
    .from("meeting_pairs")
    .select("id, user_a_id, user_b_id, status")
    .eq("id", pairId)
    .single();

  if (result.error || !result.data) {
    throw new Error("PAIR_NOT_FOUND");
  }

  const pair = result.data;

  if (pair.user_a_id !== userId && pair.user_b_id !== userId) {
    throw new Error("PAIR_FORBIDDEN");
  }

  return pair;
}

async function loadMeetingMessages(
  client: AppSupabaseClient,
  pairId: string,
  userId: string
): Promise<Day14ChatMessage[]> {
  const messagesResult = await client
    .from("meeting_messages")
    .select("id, sender_id, body, created_at")
    .eq("pair_id", pairId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  const rows = messagesResult.data ?? [];
  const senderIds = [...new Set(rows.map((row) => row.sender_id))];

  if (!senderIds.length) {
    return [];
  }

  const sendersResult = await client
    .from("profiles")
    .select("id, display_name, telegram_username")
    .in("id", senderIds);

  if (sendersResult.error) {
    throw sendersResult.error;
  }

  const senderMap = new Map(
    (sendersResult.data ?? []).map((sender) => [sender.id, sender])
  );

  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    senderName: senderMap.get(row.sender_id)?.display_name ?? "Участник",
    senderUsername: senderMap.get(row.sender_id)?.telegram_username ?? null,
    text: row.body,
    createdAt: row.created_at,
    isMine: row.sender_id === userId
  }));
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
  const [partnerResult, confirmationsResult, messages] = await Promise.all([
    client
      .from("profiles")
      .select("id, display_name, telegram_username, avatar_url")
      .eq("id", partnerId)
      .single(),
    client
      .from("meeting_confirmations")
      .select("user_id")
      .eq("pair_id", pair.id),
    loadMeetingMessages(client, pair.id, userId)
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
      myQrPayload: getMeetingQrPayload(pair.id, userId),
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
      },
      messages
    }
  };
}

export async function confirmDay14Meeting(
  userId: string,
  pairId: string,
  partnerCode: string
) {
  const adminClient = getSupabaseAdminClient();
  const pair = await getOwnedPair(adminClient, pairId, userId);

  if (pair.status === "confirmed") {
    return loadDay14MeetingState(adminClient, userId);
  }

  if (pair.status !== "matched") {
    throw new Error("PAIR_NOT_ACTIVE");
  }

  const partnerUserId = pair.user_a_id === userId ? pair.user_b_id : pair.user_a_id;
  const expectedPartnerCode = getMeetingConfirmationCode(pairId, partnerUserId);

  if (partnerCode !== expectedPartnerCode) {
    throw new Error("INVALID_PARTNER_CODE");
  }

  const result = await adminClient.rpc("confirm_meeting_pair", {
    p_pair_id: pairId,
    p_user_id: userId
  });

  if (result.error) {
    throw result.error;
  }

  return loadDay14MeetingState(adminClient, userId);
}

export async function sendDay14Message(
  userId: string,
  pairId: string,
  text: string
) {
  const adminClient = getSupabaseAdminClient();
  const pair = await getOwnedPair(adminClient, pairId, userId);
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new Error("EMPTY_MESSAGE");
  }

  if (cleanedText.length > 500) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  if (pair.status !== "matched" && pair.status !== "confirmed") {
    throw new Error("PAIR_NOT_ACTIVE");
  }

  const insertResult = await adminClient.from("meeting_messages").insert({
    pair_id: pairId,
    sender_id: userId,
    body: cleanedText
  });

  if (insertResult.error) {
    throw insertResult.error;
  }

  return loadDay14MeetingState(adminClient, userId);
}
