import { NextResponse } from "next/server";

import { requireDay16UserId, startDay16Quiz } from "@/lib/day16-server";

export async function POST() {
  try {
    const userId = await requireDay16UserId();
    const state = await startDay16Quiz(userId);

    return NextResponse.json(state);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to start day 16 quiz." },
      { status }
    );
  }
}
