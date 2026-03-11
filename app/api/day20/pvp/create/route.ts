import { NextResponse } from "next/server";

import { createDay20RaceRoom, requireDay20UserId } from "@/lib/day20-server";

export async function POST() {
  try {
    const userId = await requireDay20UserId();
    const state = await createDay20RaceRoom(userId);
    return NextResponse.json(state);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ACTIVE_RACE_EXISTS"
        ? "У вас уже есть активный заезд."
        : error instanceof Error && error.message === "UNAUTHORIZED"
          ? "Unauthorized"
          : "Failed to create race room.";
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "ACTIVE_RACE_EXISTS"
          ? 400
          : 500;

    if (status === 500) {
      console.error("Day 20 create race route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
