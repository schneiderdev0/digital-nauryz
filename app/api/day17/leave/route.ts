import { NextResponse } from "next/server";

import { leaveDay17Group, requireDay17UserId } from "@/lib/day17-server";

export async function POST() {
  try {
    const userId = await requireDay17UserId();
    const state = await leaveDay17Group(userId);

    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            ["DAY17_GROUP_NOT_FOUND", "DAY17_GROUP_COMPLETED"].includes(error.message)
          ? 400
          : 500;

    const message =
      error instanceof Error && error.message === "DAY17_GROUP_NOT_FOUND"
        ? "Вы сейчас не состоите в семейной группе."
        : error instanceof Error && error.message === "DAY17_GROUP_COMPLETED"
          ? "Из завершенной семьи выйти нельзя."
          : status === 401
            ? "Сессия Telegram не подтверждена. Откройте мини-приложение заново."
            : "Не удалось выйти из семейной группы.";

    if (status === 500) {
      console.error("Day 17 leave route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
