import { NextResponse } from "next/server";

import { getDay14MeetingState, requireDay14UserId } from "@/lib/day14-server";

export async function GET() {
  try {
    const userId = await requireDay14UserId();
    const state = await getDay14MeetingState(userId);

    return NextResponse.json(state);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message = status === 401 ? "Unauthorized" : "Failed to load meeting state.";

    return NextResponse.json({ error: message }, { status });
  }
}
