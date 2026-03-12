import { NextResponse } from "next/server";

import { requireDay20UserId, startDay20RaceRoom } from "@/lib/day20-server";

export async function POST() {
  try {
    const userId = await requireDay20UserId();
    const state = await startDay20RaceRoom(userId);
    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            ["RACE_NOT_FOUND", "RACE_NOT_WAITING"].includes(error.message)
          ? 404
          : error instanceof Error &&
              ["RACE_START_FORBIDDEN", "RACE_NOT_READY"].includes(error.message)
            ? 400
            : 500;

    const message =
      error instanceof Error && error.message === "RACE_NOT_READY"
        ? "Нужен второй участник, чтобы начать гонку."
        : error instanceof Error && error.message === "RACE_START_FORBIDDEN"
          ? "Запустить гонку может только создатель комнаты."
          : error instanceof Error && error.message === "RACE_NOT_WAITING"
            ? "Эта гонка уже началась или завершилась."
            : status === 401
              ? "Сессия Telegram не подтверждена. Откройте мини-приложение заново."
              : "Failed to start race room.";

    if (status === 500) {
      console.error("Day 20 start race route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
