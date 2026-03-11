import { NextResponse } from "next/server";

import {
  getDay20State,
  getPublicDay20State,
  requireDay20UserId
} from "@/lib/day20-server";

export async function GET() {
  try {
    const userId = await requireDay20UserId();
    const state = await getDay20State(userId);
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(getPublicDay20State());
    }

    console.error("Day 20 state route failed:", error);
    return NextResponse.json(
      { error: "Failed to load day 20 state." },
      { status: 500 }
    );
  }
}
