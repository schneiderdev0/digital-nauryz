import { NextResponse } from "next/server";

import { cancelDay20RaceRoom, requireDay20UserId } from "@/lib/day20-server";

export async function POST() {
  try {
    const userId = await requireDay20UserId();
    const state = await cancelDay20RaceRoom(userId);
    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            ["RACE_NOT_FOUND", "RACE_NOT_WAITING", "RACE_CANCEL_FORBIDDEN"].includes(
              error.message
            )
          ? 400
          : 500;

    const message =
      error instanceof Error && error.message === "RACE_NOT_FOUND"
        ? "Активная комната не найдена."
        : error instanceof Error && error.message === "RACE_NOT_WAITING"
          ? "Комнату можно отменить только до старта."
          : error instanceof Error && error.message === "RACE_CANCEL_FORBIDDEN"
            ? "Комнату может отменить только ее создатель."
            : status === 401
              ? "Unauthorized"
              : "Failed to cancel race room.";

    if (status === 500) {
      console.error("Day 20 cancel race route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
