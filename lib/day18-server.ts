import type { Json } from "@/lib/database.types";
import {
  DAY18_EVENT_DAY,
  DAY18_REWARD_POINTS,
  type Day18QuestionId,
  type Day18ResultEntry,
  type Day18State,
  type Day18SubmitResult
} from "@/lib/day18";
import { getDay18QuizQuestions } from "@/lib/day18-quiz";
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
    return {
      bestScore: 0,
      lastScore: 0
    };
  }

  const metadata = value as Record<string, Json | undefined>;

  return {
    bestScore: typeof metadata.bestScore === "number" ? metadata.bestScore : 0,
    lastScore: typeof metadata.lastScore === "number" ? metadata.lastScore : 0
  };
}

async function getParticipation(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("event_participation")
    .select("metadata, completed_at")
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

async function loadLeaderboard(client: AppSupabaseClient): Promise<Day18ResultEntry[]> {
  const participationResult = await client
    .from("event_participation")
    .select("user_id, metadata")
    .eq("event_day", DAY18_EVENT_DAY)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (participationResult.error) {
    throw participationResult.error;
  }

  const rows = participationResult.data ?? [];
  const userIds = rows.map((row) => row.user_id);
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

  return rows
    .map((row) => ({
      displayName: profileMap.get(row.user_id)?.display_name ?? "Участник",
      telegramUsername: profileMap.get(row.user_id)?.telegram_username ?? null,
      score: asMetadata(row.metadata ?? null).bestScore
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);
}

function publicQuestions() {
  return getDay18QuizQuestions().map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: [...question.options],
    imageUrl: `/api/day18/image/${encodeURIComponent(question.imageFile)}`
  }));
}

export async function getDay18State(userId: string): Promise<Day18State> {
  const client = getSupabaseAdminClient();
  const [participation, rewardGranted, leaderboard] = await Promise.all([
    getParticipation(client, userId),
    hasRewardEvent(client, userId),
    loadLeaderboard(client)
  ]);
  const metadata = asMetadata(participation?.metadata ?? null);

  return {
    isAuthenticated: true,
    rewardPoints: DAY18_REWARD_POINTS,
    bestScore: metadata.bestScore,
    lastScore: metadata.lastScore,
    questionCount: getDay18QuizQuestions().length,
    hasCompletedQuiz: rewardGranted,
    questions: publicQuestions(),
    leaderboard,
    completedAt: participation?.completed_at ?? null
  };
}

export async function getPublicDay18State(): Promise<Day18State> {
  const leaderboard = await loadLeaderboard(getSupabaseAdminClient());

  return {
    isAuthenticated: false,
    rewardPoints: DAY18_REWARD_POINTS,
    bestScore: 0,
    lastScore: 0,
    questionCount: getDay18QuizQuestions().length,
    hasCompletedQuiz: false,
    questions: publicQuestions(),
    leaderboard,
    completedAt: null
  };
}

export async function submitDay18Quiz(
  userId: string,
  answers: Array<{ questionId: Day18QuestionId; selectedIndex: number }>
): Promise<Day18SubmitResult> {
  const client = getSupabaseAdminClient();
  const participation = await getParticipation(client, userId);
  const currentMetadata = asMetadata(participation?.metadata ?? null);
  const quizQuestions = getDay18QuizQuestions();

  const evaluated = quizQuestions.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    const selectedIndex =
      typeof answer?.selectedIndex === "number" ? answer.selectedIndex : -1;
    const isCorrect = selectedIndex === question.correctIndex;

    return {
      questionId: question.id,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect
    };
  });

  const score = evaluated.filter((answer) => answer.isCorrect).length;
  const nextMetadata = {
    bestScore: Math.max(currentMetadata.bestScore, score),
    lastScore: score
  };
  const now = new Date().toISOString();

  const upsertResult = await client.from("event_participation").upsert(
    {
      user_id: userId,
      event_day: DAY18_EVENT_DAY,
      status: "completed",
      started_at: participation?.completed_at ?? now,
      completed_at: now,
      metadata: nextMetadata
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
        score
      }
    });

    if (scoreResult.error) {
      throw scoreResult.error;
    }
  }

  return {
    state: await getDay18State(userId),
    score,
    totalQuestions: quizQuestions.length,
    answers: evaluated
  };
}
