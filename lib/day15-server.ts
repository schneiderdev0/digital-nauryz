import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Day15RecipientsPage, Day15State } from "@/lib/day15";
import type { AppSupabaseClient } from "@/lib/supabase/queries";

async function getAuthenticatedUserId() {
  const client = await getSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  return user?.id ?? null;
}

export async function requireDay15UserId() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

export async function getDay15State(userId: string) {
  const client = getSupabaseAdminClient();
  return loadDay15State(client, userId);
}

export async function getDay15Recipients(
  userId: string,
  query: string,
  offset: number,
  limit: number
) {
  const client = getSupabaseAdminClient();
  return loadDay15Recipients(client, userId, query, offset, limit);
}

export async function loadDay15Recipients(
  client: AppSupabaseClient,
  userId: string,
  query: string,
  offset: number,
  limit: number
): Promise<Day15RecipientsPage> {
  const normalizedQuery = query.trim();
  let builder = client
    .from("profiles")
    .select("id, display_name, telegram_username, avatar_url", {
      count: "exact"
    })
    .neq("id", userId)
    .order("display_name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (normalizedQuery) {
    const escaped = normalizedQuery.replace(/[%_,]/g, "\\$&");
    builder = builder.or(
      `display_name.ilike.%${escaped}%,telegram_username.ilike.%${escaped}%`
    );
  }

  const result = await builder;

  if (result.error) {
    throw result.error;
  }

  const total = result.count ?? 0;

  return {
    items:
      result.data?.map((profile) => ({
        id: profile.id,
        displayName: profile.display_name,
        telegramUsername: profile.telegram_username,
        avatarUrl: profile.avatar_url
      })) ?? [],
    total,
    hasMore: offset + limit < total,
    offset,
    limit,
    query: normalizedQuery
  };
}

export async function loadDay15State(
  client: AppSupabaseClient,
  userId: string
): Promise<Day15State> {
  const [recipientsPage, sentCardsResult, receivedCardsResult, statsResult, rewardResult] =
    await Promise.all([
      loadDay15Recipients(client, userId, "", 0, 20),
      client
        .from("kindness_cards")
        .select("id, message, template_id, created_at, recipient_id")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      client
        .from("kindness_cards")
        .select("id, message, template_id, created_at, sender_id")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      client.from("kindness_live_stats").select("total_cards_sent, active_senders").single(),
      client
        .from("score_events")
        .select("id")
        .eq("user_id", userId)
        .eq("event_day", 15)
        .eq("reason", "day15_first_card")
        .maybeSingle()
    ]);

  if (sentCardsResult.error) throw sentCardsResult.error;
  if (receivedCardsResult.error) throw receivedCardsResult.error;
  if (statsResult.error) throw statsResult.error;
  if (rewardResult.error) throw rewardResult.error;

  const recipientIds = sentCardsResult.data?.map((card) => card.recipient_id) ?? [];
  const senderIds = receivedCardsResult.data?.map((card) => card.sender_id) ?? [];
  const relatedProfileIds = [...new Set([...recipientIds, ...senderIds])];

  const relatedProfilesResult = relatedProfileIds.length
    ? await client
        .from("profiles")
        .select("id, display_name, telegram_username")
        .in("id", relatedProfileIds)
    : { data: [], error: null };

  if (relatedProfilesResult.error) throw relatedProfilesResult.error;

  const relatedProfilesMap = new Map(
    (relatedProfilesResult.data ?? []).map((profile) => [profile.id, profile])
  );

  const sentCount = sentCardsResult.data?.length ?? 0;

  return {
    isAuthenticated: true,
    sentCount,
    remainingCount: Math.max(0, 10 - sentCount),
    firstSendRewardGranted: Boolean(rewardResult.data),
    recipients: recipientsPage.items,
    sentCards:
      sentCardsResult.data?.map((card) => ({
        id: card.id,
        message: card.message,
        templateId: card.template_id,
        createdAt: card.created_at,
        recipient: {
          id: card.recipient_id,
          displayName: relatedProfilesMap.get(card.recipient_id)?.display_name ?? "Участник",
          telegramUsername: relatedProfilesMap.get(card.recipient_id)?.telegram_username ?? null
        }
      })) ?? [],
    receivedCards:
      receivedCardsResult.data?.map((card) => ({
        id: card.id,
        message: card.message,
        templateId: card.template_id,
        createdAt: card.created_at,
        sender: {
          id: card.sender_id,
          displayName: relatedProfilesMap.get(card.sender_id)?.display_name ?? "Участник",
          telegramUsername: relatedProfilesMap.get(card.sender_id)?.telegram_username ?? null
        }
      })) ?? [],
    liveStats: {
      totalCardsSent: statsResult.data?.total_cards_sent ?? 0,
      activeSenders: statsResult.data?.active_senders ?? 0
    }
  };
}
