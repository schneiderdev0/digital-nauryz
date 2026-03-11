import { NextResponse } from "next/server";

import {
  getDay18State,
  getPublicDay18State,
  requireDay18UserId
} from "@/lib/day18-server";

export async function GET() {
  try {
    const userId = await requireDay18UserId();
    const state = await getDay18State(userId);
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(getPublicDay18State());
    }

    console.error("Day 18 state route failed:", error);
    return NextResponse.json(
      { error: "Failed to load day 18 state." },
      { status: 500 }
    );
  }
}
