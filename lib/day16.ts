export const DAY16_EVENT_DAY = 16;
export const DAY16_SECONDS_PER_QUESTION = 15;
export const DAY16_POINTS_PER_CORRECT = 10;

export type Day16Question = {
  id: number;
  question: string;
  options: string[];
};

export type Day16AnswerRecord = {
  questionId: number;
  selectedOption: number | null;
  isCorrect: boolean;
  answeredAt: string;
  timedOut: boolean;
};

export type Day16ProgressMetadata = {
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  answers: Day16AnswerRecord[];
  completedAt?: string | null;
  score?: number;
  correctAnswersCount?: number;
};

export type Day16LatestAnswerFeedback = {
  questionId: number;
  question: string;
  selectedOption: number | null;
  selectedLabel: string | null;
  correctOption: number;
  correctLabel: string;
  isCorrect: boolean;
  explanation: string;
  timedOut: boolean;
};

export type Day16ResultItem = Day16LatestAnswerFeedback;

export type Day16LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  telegramUsername: string | null;
  score: number;
};

export type Day16QuizState =
  | {
      isAuthenticated: false;
      quizTitle: string;
      quizTheme: string;
      totalQuestions: number;
      secondsPerQuestion: number;
      status: "locked";
      leaderboard: Day16LeaderboardEntry[];
    }
  | {
      isAuthenticated: true;
      quizTitle: string;
      quizTheme: string;
      totalQuestions: number;
      secondsPerQuestion: number;
      status: "not_started";
      answeredCount: 0;
      correctAnswersCount: 0;
      score: 0;
      bestScore: number;
      startedAt: string | null;
      completedAt: string | null;
      currentQuestionIndex: 0;
      questionStartedAt: null;
      currentQuestion: null;
      latestAnswer: null;
      results: [];
      leaderboard: Day16LeaderboardEntry[];
    }
  | {
      isAuthenticated: true;
      quizTitle: string;
      quizTheme: string;
      totalQuestions: number;
      secondsPerQuestion: number;
      status: "in_progress";
      answeredCount: number;
      correctAnswersCount: number;
      score: number;
      bestScore: number;
      startedAt: string;
      completedAt: null;
      currentQuestionIndex: number;
      questionStartedAt: string;
      currentQuestion: Day16Question;
      latestAnswer: Day16LatestAnswerFeedback | null;
      results: Day16ResultItem[];
      leaderboard: Day16LeaderboardEntry[];
    }
  | {
      isAuthenticated: true;
      quizTitle: string;
      quizTheme: string;
      totalQuestions: number;
      secondsPerQuestion: number;
      status: "completed";
      answeredCount: number;
      correctAnswersCount: number;
      score: number;
      bestScore: number;
      startedAt: string;
      completedAt: string;
      currentQuestionIndex: number;
      questionStartedAt: null;
      currentQuestion: null;
      latestAnswer: Day16LatestAnswerFeedback | null;
      results: Day16ResultItem[];
      leaderboard: Day16LeaderboardEntry[];
    };
