import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type {
  Day16AnswerRecord,
  Day16LatestAnswerFeedback,
  Day16ProgressMetadata
} from "@/lib/day16";

type RawQuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

type RawQuiz = {
  title: string;
  theme: string;
  questions: RawQuizQuestion[];
};

const loadQuiz = cache(async (): Promise<RawQuiz> => {
  const filePath = path.join(process.cwd(), "quiz.json");
  const fileContent = await readFile(filePath, "utf8");
  return JSON.parse(fileContent) as RawQuiz;
});

export async function getDay16QuizDefinition() {
  const rawQuiz = await loadQuiz();

  return {
    title: rawQuiz.title,
    theme: rawQuiz.theme,
    questions: rawQuiz.questions.map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options
    }))
  };
}

export async function getDay16QuestionByIndex(index: number) {
  const rawQuiz = await loadQuiz();
  return rawQuiz.questions[index] ?? null;
}

async function getDay16QuestionById(questionId: number) {
  const rawQuiz = await loadQuiz();
  return rawQuiz.questions.find((question) => question.id === questionId) ?? null;
}

export function getDay16InitialMetadata(startedAt: string): Day16ProgressMetadata {
  return {
    currentQuestionIndex: 0,
    questionStartedAt: startedAt,
    answers: [],
    completedAt: null,
    score: 0,
    correctAnswersCount: 0
  };
}

export async function buildDay16Feedback(
  answer: Day16AnswerRecord
): Promise<Day16LatestAnswerFeedback | null> {
  const question = await getDay16QuestionById(answer.questionId);

  if (!question) {
    return null;
  }

  return {
    questionId: question.id,
    question: question.question,
    selectedOption: answer.selectedOption,
    selectedLabel:
      answer.selectedOption === null ? null : question.options[answer.selectedOption] ?? null,
    correctOption: question.correctAnswer,
    correctLabel: question.options[question.correctAnswer] ?? "",
    isCorrect: answer.isCorrect,
    explanation: question.explanation,
    timedOut: answer.timedOut
  };
}
