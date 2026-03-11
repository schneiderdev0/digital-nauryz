export const DAY18_EVENT_DAY = 18;
export const DAY18_REWARD_POINTS = 30;

export type Day18QuestionId = string;

export type Day18QuestionPublic = {
  id: Day18QuestionId;
  prompt: string;
  options: string[];
  imageUrl: string;
};

export type Day18ResultEntry = {
  displayName: string;
  telegramUsername: string | null;
  score: number;
};

export type Day18State =
  | {
      isAuthenticated: false;
      rewardPoints: number;
      bestScore: number;
      lastScore: number;
      questionCount: number;
      hasCompletedQuiz: false;
      questions: Day18QuestionPublic[];
      leaderboard: Day18ResultEntry[];
      completedAt: null;
    }
  | {
      isAuthenticated: true;
      rewardPoints: number;
      bestScore: number;
      lastScore: number;
      questionCount: number;
      hasCompletedQuiz: boolean;
      questions: Day18QuestionPublic[];
      leaderboard: Day18ResultEntry[];
      completedAt: string | null;
    };

export type Day18SubmitResult = {
  state: Day18State;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: Day18QuestionId;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
  }>;
};
