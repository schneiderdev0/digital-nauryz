import { NextResponse } from "next/server";

import type { Day18QuestionId } from "@/lib/day18";
import { requireDay18UserId, submitDay18Quiz } from "@/lib/day18-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay18UserId();
    const body = (await request.json().catch(() => null)) as
      | { answers?: Array<{ questionId?: string; selectedIndex?: number }> }
      | null;
    const answers =
      body?.answers
        ?.filter(
          (answer): answer is { questionId: string; selectedIndex: number } =>
            typeof answer?.questionId === "string" &&
            typeof answer?.selectedIndex === "number"
        )
        .map((answer) => ({
          questionId: answer.questionId as Day18QuestionId,
          selectedIndex: answer.selectedIndex
        })) ?? [];

    if (!answers.length) {
      return NextResponse.json({ error: "answers are required." }, { status: 400 });
    }

    const result = await submitDay18Quiz(userId, answers);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;

    if (status === 500) {
      console.error("Day 18 quiz route failed:", error);
    }

    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to submit day 18 quiz." },
      { status }
    );
  }
}
