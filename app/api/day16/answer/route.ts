import { NextResponse } from "next/server";

import { requireDay16UserId, submitDay16Answer } from "@/lib/day16-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay16UserId();
    const body = (await request.json().catch(() => null)) as
      | { selectedOption?: number | null }
      | null;
    const selectedOption =
      typeof body?.selectedOption === "number" ? body.selectedOption : null;

    const state = await submitDay16Answer(userId, selectedOption);

    return NextResponse.json(state);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message === "UNAUTHORIZED"
          ? "Unauthorized"
          : error.message === "QUIZ_NOT_STARTED"
            ? "Сначала запустите квиз."
            : error.message === "INVALID_OPTION"
              ? "Выбран неверный вариант ответа."
              : "Failed to submit day 16 answer."
        : "Failed to submit day 16 answer.";
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            (error.message === "QUIZ_NOT_STARTED" ||
              error.message === "INVALID_OPTION" ||
              error.message === "QUIZ_INVALID_STATE")
          ? 400
          : 500;

    if (status === 500) {
      console.error("Day 16 answer route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
