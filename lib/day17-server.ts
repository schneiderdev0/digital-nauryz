import {
  DAY17_MAX_MEMBERS,
  DAY17_REWARD_POINTS,
  type Day17Group,
  type Day17State
} from "@/lib/day17";
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

export async function requireDay17UserId() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

async function loadGroupForUser(
  client: AppSupabaseClient,
  userId: string
): Promise<Day17Group | null> {
  const membershipResult = await client
    .from("family_group_members")
    .select("group_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const groupId = membershipResult.data?.group_id;
  if (!groupId) {
    return null;
  }

  const [groupResult, membersResult] = await Promise.all([
    client
      .from("family_groups")
      .select("id, owner_id, invite_code, status, created_at, completed_at")
      .eq("id", groupId)
      .single(),
    client
      .from("family_group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true })
  ]);

  if (groupResult.error) {
    throw groupResult.error;
  }

  if (membersResult.error) {
    throw membersResult.error;
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

  const profilesMap = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );
  const members = (membersResult.data ?? []).map((member) => ({
    id: member.user_id,
    displayName: profilesMap.get(member.user_id)?.display_name ?? "Участник",
    telegramUsername: profilesMap.get(member.user_id)?.telegram_username ?? null,
    avatarUrl: profilesMap.get(member.user_id)?.avatar_url ?? null,
    joinedAt: member.joined_at
  }));

  return {
    id: groupResult.data.id,
    inviteCode: groupResult.data.invite_code,
    status: groupResult.data.status as "forming" | "completed",
    createdAt: groupResult.data.created_at,
    completedAt: groupResult.data.completed_at,
    ownerId: groupResult.data.owner_id,
    isOwner: groupResult.data.owner_id === userId,
    memberCount: members.length,
    remainingSlots: Math.max(0, DAY17_MAX_MEMBERS - members.length),
    members
  };
}

export async function getDay17State(userId: string): Promise<Day17State> {
  const group = await loadGroupForUser(getSupabaseAdminClient(), userId);

  return {
    isAuthenticated: true,
    maxMembers: DAY17_MAX_MEMBERS,
    rewardPoints: DAY17_REWARD_POINTS,
    group
  };
}

export function getPublicDay17State(): Day17State {
  return {
    isAuthenticated: false,
    maxMembers: DAY17_MAX_MEMBERS,
    rewardPoints: DAY17_REWARD_POINTS,
    group: null
  };
}

export async function createDay17Group(userId: string) {
  const client = getSupabaseAdminClient();
  const result = await client.rpc("create_family_group", {
    p_user_id: userId
  });

  if (result.error) {
    throw result.error;
  }

  return getDay17State(userId);
}

export async function joinDay17Group(userId: string, inviteCode: string) {
  const normalizedCode = inviteCode.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error("INVITE_CODE_REQUIRED");
  }

  const client = getSupabaseAdminClient();
  const result = await client.rpc("join_family_group", {
    p_user_id: userId,
    p_invite_code: normalizedCode
  });

  if (result.error) {
    throw result.error;
  }

  return getDay17State(userId);
}

export async function leaveDay17Group(userId: string) {
  const client = getSupabaseAdminClient();
  const result = await client.rpc("leave_family_group", {
    p_user_id: userId
  });

  if (result.error) {
    throw result.error;
  }

  return getDay17State(userId);
}
