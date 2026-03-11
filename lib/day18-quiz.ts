import { readFileSync } from "node:fs";
import path from "node:path";

type ClothQuizFile = {
  title: string;
  questions: Array<{
    id: number;
    image: string;
    question: string;
    options: string[];
    correct: number;
  }>;
};

export type Day18QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  imageFile: string;
};

let cachedQuizQuestions: Day18QuizQuestion[] | null = null;

export function getDay18QuizQuestions(): Day18QuizQuestion[] {
  if (cachedQuizQuestions) {
    return cachedQuizQuestions;
  }

  const filePath = path.join(process.cwd(), "cloth-quiz", "cloth-quiz.json");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as ClothQuizFile;

  cachedQuizQuestions = parsed.questions.map((question) => ({
    id: String(question.id),
    prompt: question.question,
    options: [...question.options],
    correctIndex: question.correct,
    imageFile: question.image
  }));

  return cachedQuizQuestions;
}

export function getDay18QuizImagePath(imageFile: string) {
  return path.join(process.cwd(), "cloth-quiz", imageFile);
}
