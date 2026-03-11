import { NextResponse } from "next/server";

import {
  getDay17State,
  getPublicDay17State,
  requireDay17UserId
} from "@/lib/day17-server";

export async function GET() {
  try {
    const userId = await requireDay17UserId();
    const state = await getDay17State(userId);

    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(getPublicDay17State());
    }

    console.error("Day 17 state route failed:", error);
    return NextResponse.json(
      { error: "Failed to load day 17 state." },
      { status: 500 }
    );
  }
}
