import { NextResponse } from "next/server";

import {
  getDay19State,
  getPublicDay19State,
  requireDay19UserId
} from "@/lib/day19-server";

export async function GET() {
  try {
    const userId = await requireDay19UserId();
    const state = await getDay19State(userId);
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(getPublicDay19State());
    }

    console.error("Day 19 state route failed:", error);
    return NextResponse.json(
      { error: "Failed to load day 19 state." },
      { status: 500 }
    );
  }
}
