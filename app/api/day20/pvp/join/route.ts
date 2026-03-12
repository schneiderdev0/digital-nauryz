import { NextResponse } from "next/server";

import { joinDay20RaceRoom, requireDay20UserId } from "@/lib/day20-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay20UserId();
    const body = (await request.json().catch(() => null)) as
      | { inviteCode?: string }
      | null;
    const inviteCode = body?.inviteCode?.trim() ?? "";

    const state = await joinDay20RaceRoom(userId, inviteCode);
    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            ["INVITE_CODE_REQUIRED", "RACE_NOT_FOUND", "RACE_UNAVAILABLE", "RACE_FULL", "ACTIVE_RACE_EXISTS"].includes(
              error.message
            )
          ? 400
          : 500;

    const message =
      error instanceof Error && error.message === "INVITE_CODE_REQUIRED"
        ? "Введите код гонки."
        : error instanceof Error && error.message === "RACE_NOT_FOUND"
          ? "Гонка по этому коду не найдена."
          : error instanceof Error && error.message === "RACE_UNAVAILABLE"
            ? "Эта гонка уже началась или завершилась."
            : error instanceof Error && error.message === "RACE_FULL"
              ? "В этой гонке уже два участника."
              : error instanceof Error && error.message === "ACTIVE_RACE_EXISTS"
                ? "Сначала завершите текущий заезд."
                : status === 401
                  ? "Сессия Telegram не подтверждена. Откройте мини-приложение заново."
                  : "Failed to join race room.";

    if (status === 500) {
      console.error("Day 20 join race route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
