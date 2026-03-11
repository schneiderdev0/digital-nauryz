import type { Json } from "@/lib/database.types";
import {
  DAY16_EVENT_DAY,
  DAY16_POINTS_PER_CORRECT,
  DAY16_SECONDS_PER_QUESTION,
  type Day16AnswerRecord,
  type Day16LeaderboardEntry,
  type Day16ProgressMetadata,
  type Day16QuizState
} from "@/lib/day16";
import {
  buildDay16Feedback,
  getDay16InitialMetadata,
  getDay16QuestionByIndex,
  getDay16QuizDefinition
} from "@/lib/day16-quiz";
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

export async function requireDay16UserId() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return userId;
}

function asDay16Metadata(value: Json | null): Day16ProgressMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const metadata = value as Record<string, Json | undefined>;
  const answers = Array.isArray(metadata.answers)
    ? metadata.answers
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }

          const record = item as Record<string, Json | undefined>;
          if (
            typeof record.questionId !== "number" ||
            (record.selectedOption !== null && typeof record.selectedOption !== "number") ||
            typeof record.isCorrect !== "boolean" ||
            typeof record.answeredAt !== "string" ||
            typeof record.timedOut !== "boolean"
          ) {
            return null;
          }

          return {
            questionId: record.questionId,
            selectedOption: record.selectedOption,
            isCorrect: record.isCorrect,
            answeredAt: record.answeredAt,
            timedOut: record.timedOut
          } satisfies Day16AnswerRecord;
        })
        .filter((item): item is Day16AnswerRecord => Boolean(item))
    : [];

  return {
    currentQuestionIndex:
      typeof metadata.currentQuestionIndex === "number" ? metadata.currentQuestionIndex : 0,
    questionStartedAt:
      typeof metadata.questionStartedAt === "string" ? metadata.questionStartedAt : null,
    answers,
    completedAt: typeof metadata.completedAt === "string" ? metadata.completedAt : null,
    score: typeof metadata.score === "number" ? metadata.score : 0,
    correctAnswersCount:
      typeof metadata.correctAnswersCount === "number" ? metadata.correctAnswersCount : 0
  };
}

async function getDay16Participation(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("event_participation")
    .select("id, status, metadata, started_at, completed_at")
    .eq("user_id", userId)
    .eq("event_day", DAY16_EVENT_DAY)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function getDay16BestScore(client: AppSupabaseClient, userId: string) {
  const result = await client
    .from("score_events")
    .select("points")
    .eq("user_id", userId)
    .eq("event_day", DAY16_EVENT_DAY);

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).reduce((sum, item) => sum + item.points, 0);
}

async function getDay16Leaderboard(client: AppSupabaseClient): Promise<Day16LeaderboardEntry[]> {
  const scoreEventsResult = await client
    .from("score_events")
    .select("user_id, points")
    .eq("event_day", DAY16_EVENT_DAY);

  if (scoreEventsResult.error) {
    throw scoreEventsResult.error;
  }

  const scoreByUser = new Map<string, number>();
  for (const event of scoreEventsResult.data ?? []) {
    scoreByUser.set(event.user_id, (scoreByUser.get(event.user_id) ?? 0) + event.points);
  }

  const rankedUsers = [...scoreByUser.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10);

  if (rankedUsers.length === 0) {
    return [];
  }

  const profileIds = rankedUsers.map(([userId]) => userId);
  const profilesResult = await client
    .from("profiles")
    .select("id, display_name, telegram_username")
    .in("id", profileIds);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  const profilesById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );

  return rankedUsers.map(([userId, score], index) => ({
    rank: index + 1,
    userId,
    displayName: profilesById.get(userId)?.display_name ?? "Участник",
    telegramUsername: profilesById.get(userId)?.telegram_username ?? null,
    score
  }));
}

export async function getDay16State(userId: string): Promise<Day16QuizState> {
  const client = getSupabaseAdminClient();
  const [participation, bestScore, leaderboard, quiz] = await Promise.all([
    getDay16Participation(client, userId),
    getDay16BestScore(client, userId),
    getDay16Leaderboard(client),
    getDay16QuizDefinition()
  ]);

  const baseState = {
    quizTitle: quiz.title,
    quizTheme: quiz.theme,
    totalQuestions: quiz.questions.length,
    secondsPerQuestion: DAY16_SECONDS_PER_QUESTION,
    leaderboard
  };

  if (!participation) {
    return {
      isAuthenticated: true,
      status: "not_started",
      answeredCount: 0,
      correctAnswersCount: 0,
      score: 0,
      bestScore,
      startedAt: null,
      completedAt: null,
      currentQuestionIndex: 0,
      questionStartedAt: null,
      currentQuestion: null,
      latestAnswer: null,
      results: [],
      ...baseState
    };
  }

  const metadata =
    asDay16Metadata(participation.metadata) ??
    getDay16InitialMetadata(participation.started_at ?? new Date().toISOString());
  const results = (
    await Promise.all(metadata.answers.map((answer) => buildDay16Feedback(answer)))
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const latestAnswer = results.at(-1) ?? null;
  const correctAnswersCount =
    metadata.correctAnswersCount ?? metadata.answers.filter((answer) => answer.isCorrect).length;
  const score = metadata.score ?? correctAnswersCount * DAY16_POINTS_PER_CORRECT;

  if (participation.status === "completed" && participation.started_at && participation.completed_at) {
    return {
      isAuthenticated: true,
      status: "completed",
      answeredCount: metadata.answers.length,
      correctAnswersCount,
      score,
      bestScore,
      startedAt: participation.started_at,
      completedAt: participation.completed_at,
      currentQuestionIndex: metadata.currentQuestionIndex,
      questionStartedAt: null,
      currentQuestion: null,
      latestAnswer,
      results,
      ...baseState
    };
  }

  const currentQuestion = await getDay16QuestionByIndex(metadata.currentQuestionIndex);

  if (!currentQuestion || !metadata.questionStartedAt || !participation.started_at) {
    return {
      isAuthenticated: true,
      status: "not_started",
      answeredCount: 0,
      correctAnswersCount: 0,
      score: 0,
      bestScore,
      startedAt: null,
      completedAt: null,
      currentQuestionIndex: 0,
      questionStartedAt: null,
      currentQuestion: null,
      latestAnswer: null,
      results: [],
      ...baseState
    };
  }

  return {
    isAuthenticated: true,
    status: "in_progress",
    answeredCount: metadata.answers.length,
    correctAnswersCount,
    score,
    bestScore,
    startedAt: participation.started_at,
    completedAt: null,
    currentQuestionIndex: metadata.currentQuestionIndex,
    questionStartedAt: metadata.questionStartedAt,
    currentQuestion: {
      id: currentQuestion.id,
      question: currentQuestion.question,
      options: currentQuestion.options
    },
    latestAnswer,
    results,
    ...baseState
  };
}

export async function getPublicDay16State(): Promise<Day16QuizState> {
  const [leaderboard, quiz] = await Promise.all([
    getDay16Leaderboard(getSupabaseAdminClient()),
    getDay16QuizDefinition()
  ]);

  return {
    isAuthenticated: false,
    status: "locked",
    quizTitle: quiz.title,
    quizTheme: quiz.theme,
    totalQuestions: quiz.questions.length,
    secondsPerQuestion: DAY16_SECONDS_PER_QUESTION,
    leaderboard
  };
}

export async function startDay16Quiz(userId: string) {
  const client = getSupabaseAdminClient();
  const existing = await getDay16Participation(client, userId);

  if (existing?.status === "completed" || existing?.status === "in_progress") {
    return getDay16State(userId);
  }

  const startedAt = new Date().toISOString();
  const result = await client
    .from("event_participation")
    .upsert(
      {
        user_id: userId,
        event_day: DAY16_EVENT_DAY,
        status: "in_progress",
        started_at: startedAt,
        completed_at: null,
        metadata: getDay16InitialMetadata(startedAt)
      },
      { onConflict: "user_id,event_day" }
    );

  if (result.error) {
    throw result.error;
  }

  return getDay16State(userId);
}

export async function restartDay16Quiz(userId: string) {
  const client = getSupabaseAdminClient();
  const restartedAt = new Date().toISOString();

  const result = await client
    .from("event_participation")
    .upsert(
      {
        user_id: userId,
        event_day: DAY16_EVENT_DAY,
        status: "in_progress",
        started_at: restartedAt,
        completed_at: null,
        metadata: getDay16InitialMetadata(restartedAt)
      },
      { onConflict: "user_id,event_day" }
    );

  if (result.error) {
    throw result.error;
  }

  return getDay16State(userId);
}

export async function submitDay16Answer(
  userId: string,
  selectedOption: number | null
) {
  const client = getSupabaseAdminClient();
  const participation = await getDay16Participation(client, userId);

  if (!participation || participation.status !== "in_progress") {
    throw new Error("QUIZ_NOT_STARTED");
  }

  if (!participation.started_at) {
    throw new Error("QUIZ_INVALID_STATE");
  }

  const metadata = asDay16Metadata(participation.metadata);

  if (!metadata || metadata.questionStartedAt === null) {
    throw new Error("QUIZ_INVALID_STATE");
  }

  const [question, quizDefinition] = await Promise.all([
    getDay16QuestionByIndex(metadata.currentQuestionIndex),
    getDay16QuizDefinition()
  ]);

  if (!question) {
    throw new Error("QUIZ_INVALID_STATE");
  }

  if (
    selectedOption !== null &&
    (selectedOption < 0 || selectedOption >= question.options.length)
  ) {
    throw new Error("INVALID_OPTION");
  }

  const now = new Date();
  const questionStartedAt = new Date(metadata.questionStartedAt);
  const isTimedOut =
    now.getTime() - questionStartedAt.getTime() >= DAY16_SECONDS_PER_QUESTION * 1000;
  const effectiveSelectedOption = isTimedOut ? null : selectedOption;
  const isCorrect = effectiveSelectedOption === question.correctAnswer;

  const nextAnswers = [
    ...metadata.answers,
    {
      questionId: question.id,
      selectedOption: effectiveSelectedOption,
      isCorrect,
      answeredAt: now.toISOString(),
      timedOut: isTimedOut
    } satisfies Day16AnswerRecord
  ];

  const nextCorrectAnswersCount = nextAnswers.filter((answer) => answer.isCorrect).length;
  const nextScore = nextCorrectAnswersCount * DAY16_POINTS_PER_CORRECT;
  const isCompleted = metadata.currentQuestionIndex >= quizDefinition.questions.length - 1;

  const nextMetadata: Day16ProgressMetadata = {
    currentQuestionIndex: metadata.currentQuestionIndex + 1,
    questionStartedAt: isCompleted ? null : now.toISOString(),
    answers: nextAnswers,
    completedAt: isCompleted ? now.toISOString() : null,
    score: nextScore,
    correctAnswersCount: nextCorrectAnswersCount
  };

  const updateResult = await client
    .from("event_participation")
    .update({
      status: isCompleted ? "completed" : "in_progress",
      metadata: nextMetadata,
      completed_at: isCompleted ? now.toISOString() : null
    })
    .eq("id", participation.id);

  if (updateResult.error) {
    throw updateResult.error;
  }

  if (isCompleted) {
    const alreadyAwarded = await getDay16BestScore(client, userId);
    const delta = Math.max(0, nextScore - alreadyAwarded);

    if (delta > 0) {
      const scoreResult = await client.from("score_events").insert({
        user_id: userId,
        event_day: DAY16_EVENT_DAY,
        reason:
          alreadyAwarded > 0 ? "day16_quiz_best_score_improved" : "day16_quiz_completed",
        points: delta,
        metadata: {
          score: nextScore,
          correctAnswersCount: nextCorrectAnswersCount,
          totalQuestions: quizDefinition.questions.length
        }
      });

      if (scoreResult.error) {
        throw scoreResult.error;
      }
    }
  }

  return getDay16State(userId);
}
