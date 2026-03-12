import type { Json } from "@/lib/database.types";
import type { AppSupabaseClient } from "@/lib/supabase/queries";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DAY20_EVENT_DAY,
  DAY20_LEADERBOARD_LIMIT,
  DAY20_PVP_DURATION_SECONDS,
  DAY20_PVP_REWARD_POINTS,
  DAY20_SOLO_DURATION_SECONDS,
  type Day20LeaderboardEntry,
  type Day20RaceRoom,
  type Day20RoomMember,
  type Day20State
} from "@/lib/day20";

type Day20Metadata = {
  soloBestTaps: number;
  soloLastTaps: number;
};

async function getAuthenticatedUserId() {
  const client = await getSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  return user?.id ?? null;
}

export async function requireDay20UserId() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

function asDay20Metadata(value: Json | null): Day20Metadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      soloBestTaps: 0,
      soloLastTaps: 0
    };
  }

  const metadata = value as Record<string, Json | undefined>;

  return {
    soloBestTaps:
      typeof metadata.soloBestTaps === "number" ? metadata.soloBestTaps : 0,
    soloLastTaps:
      typeof metadata.soloLastTaps === "number" ? metadata.soloLastTaps : 0
  };
}

async function getParticipation(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("event_participation")
    .select("metadata")
    .eq("user_id", userId)
    .eq("event_day", DAY20_EVENT_DAY)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function ensureParticipation(client: AppSupabaseClient, userId: string, metadata: Record<string, Json> = {}) {
  const current = await getParticipation(client, userId);
  const now = new Date().toISOString();
  const mergedMetadata =
    current?.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
      ? { ...(current.metadata as Record<string, Json>), ...metadata }
      : metadata;

  const result = await client.from("event_participation").upsert(
    {
      user_id: userId,
      event_day: DAY20_EVENT_DAY,
      status: "in_progress",
      started_at: now,
      metadata: mergedMetadata
    },
    { onConflict: "user_id,event_day" }
  );

  if (result.error) {
    throw result.error;
  }
}

async function generateInviteCode(client: AppSupabaseClient) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const result = await client
      .from("race_rooms")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    if (!result.data) {
      return code;
    }
  }

  throw new Error("INVITE_CODE_FAILED");
}

async function findLatestRoomIdForUser(client: AppSupabaseClient, userId: string) {
  const membershipResult = await client
    .from("race_room_members")
    .select("room_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(8);

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const roomIds = (membershipResult.data ?? []).map((entry) => entry.room_id);
  if (!roomIds.length) {
    return null;
  }

  const roomsResult = await client
    .from("race_rooms")
    .select("id, status, created_at")
    .in("id", roomIds);

  if (roomsResult.error) {
    throw roomsResult.error;
  }

  const roomMap = new Map((roomsResult.data ?? []).map((room) => [room.id, room]));

  for (const membership of membershipResult.data ?? []) {
    const room = roomMap.get(membership.room_id);
    if (room && room.status !== "finished") {
      return room.id;
    }
  }

  return membershipResult.data?.[0]?.room_id ?? null;
}

async function loadRaceRoom(
  client: AppSupabaseClient,
  userId: string,
  roomId: string
): Promise<Day20RaceRoom | null> {
  const [roomResult, membersResult] = await Promise.all([
    client
      .from("race_rooms")
      .select("id, owner_id, invite_code, status, created_at, started_at, finished_at, winner_id, duration_seconds")
      .eq("id", roomId)
      .maybeSingle(),
    client
      .from("race_room_members")
      .select("user_id, tap_count, joined_at")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true })
  ]);

  if (roomResult.error) {
    throw roomResult.error;
  }

  if (membersResult.error) {
    throw membersResult.error;
  }

  if (!roomResult.data) {
    return null;
  }

  const memberIds = (membersResult.data ?? []).map((member) => member.user_id);
  const profilesResult = memberIds.length
    ? await client
        .from("profiles")
        .select("id, display_name, telegram_username, avatar_url")
        .in("id", memberIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );

  const members: Day20RoomMember[] = (membersResult.data ?? []).map((member) => ({
    userId: member.user_id,
    displayName: profileMap.get(member.user_id)?.display_name ?? "Участник",
    telegramUsername: profileMap.get(member.user_id)?.telegram_username ?? null,
    avatarUrl: profileMap.get(member.user_id)?.avatar_url ?? null,
    tapCount: member.tap_count,
    joinedAt: member.joined_at,
    isMe: member.user_id === userId
  }));

  const myMember = members.find((member) => member.isMe) ?? null;
  const opponent = members.find((member) => !member.isMe) ?? null;

  return {
    id: roomResult.data.id,
    inviteCode: roomResult.data.invite_code,
    status: roomResult.data.status as "waiting" | "racing" | "finished",
    createdAt: roomResult.data.created_at,
    startedAt: roomResult.data.started_at,
    finishedAt: roomResult.data.finished_at,
    endsAt: roomResult.data.started_at
      ? new Date(
          new Date(roomResult.data.started_at).getTime() +
            roomResult.data.duration_seconds * 1000
        ).toISOString()
      : null,
    durationSeconds: roomResult.data.duration_seconds,
    winnerId: roomResult.data.winner_id,
    isOwner: roomResult.data.owner_id === userId,
    myTapCount: myMember?.tapCount ?? 0,
    opponentTapCount: opponent?.tapCount ?? 0,
    members
  };
}

async function finalizeExpiredRoom(client: AppSupabaseClient, roomId: string) {
  const roomResult = await client
    .from("race_rooms")
    .select("id, status, started_at, duration_seconds, winner_id")
    .eq("id", roomId)
    .maybeSingle();

  if (roomResult.error) {
    throw roomResult.error;
  }

  const room = roomResult.data;
  if (!room || room.status !== "racing" || !room.started_at) {
    return;
  }

  const endTimestamp =
    new Date(room.started_at).getTime() + room.duration_seconds * 1000;

  if (Date.now() < endTimestamp) {
    return;
  }

  const membersResult = await client
    .from("race_room_members")
    .select("user_id, tap_count")
    .eq("room_id", roomId)
    .order("tap_count", { ascending: false });

  if (membersResult.error) {
    throw membersResult.error;
  }

  const members = membersResult.data ?? [];
  const topTapCount = members[0]?.tap_count ?? 0;
  const leaders = members.filter((member) => member.tap_count === topTapCount);
  const winnerId = leaders.length === 1 && topTapCount > 0 ? leaders[0].user_id : null;
  const finishedAt = new Date().toISOString();

  const updateResult = await client
    .from("race_rooms")
    .update({
      status: "finished",
      finished_at: finishedAt,
      winner_id: winnerId
    })
    .eq("id", roomId)
    .eq("status", "racing")
    .select("id")
    .maybeSingle();

  if (updateResult.error) {
    throw updateResult.error;
  }

  if (!updateResult.data) {
    return;
  }

  const participantIds = members.map((member) => member.user_id);

  await Promise.all(
    participantIds.map(async (participantId) => {
      const current = await getParticipation(client, participantId);
      const metadata =
        current?.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
          ? (current.metadata as Record<string, Json>)
          : {};

      const result = await client.from("event_participation").upsert(
        {
          user_id: participantId,
          event_day: DAY20_EVENT_DAY,
          status: "completed",
          started_at: room.started_at,
          completed_at: finishedAt,
          metadata: {
            ...metadata,
            lastPvpRoomId: roomId,
            lastPvpTapCount:
              members.find((member) => member.user_id === participantId)?.tap_count ?? 0
          }
        },
        { onConflict: "user_id,event_day" }
      );

      if (result.error) {
        throw result.error;
      }
    })
  );

  if (winnerId) {
    const scoreResult = await client.from("score_events").insert({
      user_id: winnerId,
      event_day: DAY20_EVENT_DAY,
      reason: `day20_pvp_win_${roomId}`,
      points: DAY20_PVP_REWARD_POINTS,
      metadata: {
        roomId
      }
    });

    if (scoreResult.error) {
      throw scoreResult.error;
    }
  }
}

async function loadLeaderboard(client: AppSupabaseClient): Promise<Day20LeaderboardEntry[]> {
  const [participationResult, scoresResult] = await Promise.all([
    client
      .from("event_participation")
      .select("user_id, metadata")
      .eq("event_day", DAY20_EVENT_DAY),
    client
      .from("score_events")
      .select("user_id, points, reason")
      .eq("event_day", DAY20_EVENT_DAY)
  ]);

  if (participationResult.error) {
    throw participationResult.error;
  }

  if (scoresResult.error) {
    throw scoresResult.error;
  }

  const stats = new Map<
    string,
    { soloBestTaps: number; score: number; pvpWins: number }
  >();

  (participationResult.data ?? []).forEach((entry) => {
    const metadata = asDay20Metadata(entry.metadata ?? null);
    const current = stats.get(entry.user_id) ?? {
      soloBestTaps: 0,
      score: 0,
      pvpWins: 0
    };

    current.soloBestTaps = Math.max(current.soloBestTaps, metadata.soloBestTaps);
    stats.set(entry.user_id, current);
  });

  (scoresResult.data ?? []).forEach((entry) => {
    const current = stats.get(entry.user_id) ?? {
      soloBestTaps: 0,
      score: 0,
      pvpWins: 0
    };

    current.score += entry.points;
    if (entry.reason.startsWith("day20_pvp_win_")) {
      current.pvpWins += 1;
    }

    stats.set(entry.user_id, current);
  });

  const userIds = Array.from(stats.keys());
  if (!userIds.length) {
    return [];
  }

  const profilesResult = await client
    .from("profiles")
    .select("id, display_name, telegram_username")
    .in("id", userIds);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );

  return userIds
    .map((userId) => {
      const profile = profileMap.get(userId);
      const stat = stats.get(userId);

      return {
        userId,
        displayName: profile?.display_name ?? "Участник",
        telegramUsername: profile?.telegram_username ?? null,
        score: stat?.score ?? 0,
        soloBestTaps: stat?.soloBestTaps ?? 0,
        pvpWins: stat?.pvpWins ?? 0
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.soloBestTaps !== left.soloBestTaps) {
        return right.soloBestTaps - left.soloBestTaps;
      }

      return left.displayName.localeCompare(right.displayName, "ru");
    })
    .slice(0, DAY20_LEADERBOARD_LIMIT)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
}

async function loadDay20Room(client: AppSupabaseClient, userId: string) {
  const latestRoomId = await findLatestRoomIdForUser(client, userId);

  if (!latestRoomId) {
    return null;
  }

  await finalizeExpiredRoom(client, latestRoomId);
  return loadRaceRoom(client, userId, latestRoomId);
}

async function getOwnedDay20Room(client: AppSupabaseClient, userId: string) {
  const roomId = await findLatestRoomIdForUser(client, userId);

  if (!roomId) {
    throw new Error("RACE_NOT_FOUND");
  }

  const room = await loadRaceRoom(client, userId, roomId);

  if (!room) {
    throw new Error("RACE_NOT_FOUND");
  }

  return room;
}

export async function getDay20State(userId: string): Promise<Day20State> {
  const client = getSupabaseAdminClient();
  const [participation, room, leaderboard] = await Promise.all([
    getParticipation(client, userId),
    loadDay20Room(client, userId),
    loadLeaderboard(client)
  ]);
  const metadata = asDay20Metadata(participation?.metadata ?? null);

  return {
    isAuthenticated: true,
    rewardPoints: DAY20_PVP_REWARD_POINTS,
    soloDurationSeconds: DAY20_SOLO_DURATION_SECONDS,
    pvpDurationSeconds: DAY20_PVP_DURATION_SECONDS,
    soloBestTaps: metadata.soloBestTaps,
    soloLastTaps: metadata.soloLastTaps,
    room,
    leaderboard
  };
}

export function getPublicDay20State(): Day20State {
  return {
    isAuthenticated: false,
    rewardPoints: DAY20_PVP_REWARD_POINTS,
    soloDurationSeconds: DAY20_SOLO_DURATION_SECONDS,
    pvpDurationSeconds: DAY20_PVP_DURATION_SECONDS,
    soloBestTaps: 0,
    soloLastTaps: 0,
    room: null,
    leaderboard: []
  };
}

export async function saveDay20SoloRun(userId: string, taps: number) {
  const client = getSupabaseAdminClient();
  const current = await getParticipation(client, userId);
  const metadata = asDay20Metadata(current?.metadata ?? null);
  const normalizedTaps = Math.max(0, Math.min(500, Math.floor(taps)));
  const nextMetadata = {
    soloBestTaps: Math.max(metadata.soloBestTaps, normalizedTaps),
    soloLastTaps: normalizedTaps
  };
  const now = new Date().toISOString();

  const result = await client.from("event_participation").upsert(
    {
      user_id: userId,
      event_day: DAY20_EVENT_DAY,
      status: "completed",
      started_at: now,
      completed_at: now,
      metadata: nextMetadata
    },
    { onConflict: "user_id,event_day" }
  );

  if (result.error) {
    throw result.error;
  }

  return getDay20State(userId);
}

export async function createDay20RaceRoom(userId: string) {
  const client = getSupabaseAdminClient();
  const activeRoom = await loadDay20Room(client, userId);

  if (activeRoom && activeRoom.status !== "finished") {
    throw new Error("ACTIVE_RACE_EXISTS");
  }

  const inviteCode = await generateInviteCode(client);
  const roomResult = await client
    .from("race_rooms")
    .insert({
      owner_id: userId,
      invite_code: inviteCode,
      status: "waiting",
      duration_seconds: DAY20_PVP_DURATION_SECONDS
    })
    .select("id")
    .single();

  if (roomResult.error) {
    throw roomResult.error;
  }

  const memberResult = await client.from("race_room_members").insert({
    room_id: roomResult.data.id,
    user_id: userId,
    tap_count: 0
  });

  if (memberResult.error) {
    throw memberResult.error;
  }

  await ensureParticipation(client, userId, { lastPvpRoomId: roomResult.data.id });

  return getDay20State(userId);
}

export async function joinDay20RaceRoom(userId: string, inviteCode: string) {
  const client = getSupabaseAdminClient();
  const activeRoom = await loadDay20Room(client, userId);

  if (activeRoom && activeRoom.status !== "finished") {
    throw new Error("ACTIVE_RACE_EXISTS");
  }

  const normalizedCode = inviteCode.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error("INVITE_CODE_REQUIRED");
  }

  const roomResult = await client
    .from("race_rooms")
    .select("id, status, started_at")
    .eq("invite_code", normalizedCode)
    .maybeSingle();

  if (roomResult.error) {
    throw roomResult.error;
  }

  if (!roomResult.data) {
    throw new Error("RACE_NOT_FOUND");
  }

  if (roomResult.data.status !== "waiting") {
    throw new Error("RACE_UNAVAILABLE");
  }

  const membersResult = await client
    .from("race_room_members")
    .select("user_id")
    .eq("room_id", roomResult.data.id);

  if (membersResult.error) {
    throw membersResult.error;
  }

  if ((membersResult.data ?? []).length >= 2) {
    throw new Error("RACE_FULL");
  }

  if ((membersResult.data ?? []).some((member) => member.user_id === userId)) {
    return getDay20State(userId);
  }

  const insertResult = await client.from("race_room_members").insert({
    room_id: roomResult.data.id,
    user_id: userId,
    tap_count: 0
  });

  if (insertResult.error) {
    throw insertResult.error;
  }

  const startResult = await client
    .from("race_rooms")
    .update({
      status: "racing",
      started_at: new Date().toISOString()
    })
    .eq("id", roomResult.data.id)
    .eq("status", "waiting");

  if (startResult.error) {
    throw startResult.error;
  }

  await ensureParticipation(client, userId, { lastPvpRoomId: roomResult.data.id });

  return getDay20State(userId);
}

export async function cancelDay20RaceRoom(userId: string) {
  const client = getSupabaseAdminClient();
  const room = await getOwnedDay20Room(client, userId);

  if (room.status !== "waiting") {
    throw new Error("RACE_NOT_WAITING");
  }

  if (!room.isOwner) {
    throw new Error("RACE_CANCEL_FORBIDDEN");
  }

  const result = await client.from("race_rooms").delete().eq("id", room.id);

  if (result.error) {
    throw result.error;
  }

  return getDay20State(userId);
}

export async function registerDay20PvpTaps(userId: string, roomId: string, tapCount: number) {
  const client = getSupabaseAdminClient();
  const normalizedTapCount = Math.max(1, Math.min(25, Math.floor(tapCount)));
  const room = await loadRaceRoom(client, userId, roomId);

  if (!room) {
    throw new Error("RACE_NOT_FOUND");
  }

  if (room.status === "racing" && room.endsAt && Date.now() >= new Date(room.endsAt).getTime()) {
    await finalizeExpiredRoom(client, roomId);
    return;
  }

  if (room.status !== "racing") {
    return;
  }

  const result = await client.rpc("register_pvp_race_taps", {
    p_room_id: roomId,
    p_user_id: userId,
    p_tap_count: normalizedTapCount
  });

  if (result.error) {
    throw result.error;
  }

  const refreshedRoom = await loadRaceRoom(client, userId, roomId);
  if (refreshedRoom?.status === "racing" && refreshedRoom.endsAt && Date.now() >= new Date(refreshedRoom.endsAt).getTime()) {
    await finalizeExpiredRoom(client, roomId);
  }
}
