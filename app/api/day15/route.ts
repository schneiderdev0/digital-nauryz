import { NextResponse } from "next/server";

import { getDay15State, requireDay15UserId } from "@/lib/day15-server";

export async function GET() {
  try {
    const userId = await requireDay15UserId();
    const state = await getDay15State(userId);

    return NextResponse.json(state);
  } catch (error) {
    console.error("Day 15 state route failed:", error);
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to load day 15 state." },
      { status }
    );
  }
}
