import { NextResponse } from "next/server";

import { createDay17Group, requireDay17UserId } from "@/lib/day17-server";

export async function POST() {
  try {
    const userId = await requireDay17UserId();
    const state = await createDay17Group(userId);

    return NextResponse.json(state);
  } catch (error) {
    const message =
      error instanceof Error &&
      error.message.toLowerCase().includes("already belongs")
        ? "Вы уже состоите в семейной группе."
        : "Failed to create day 17 group.";
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message.toLowerCase().includes("already belongs")
          ? 400
          : 500;

    if (status === 500) {
      console.error("Day 17 create route failed:", error);
    }

    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : message },
      { status }
    );
  }
}
