import { NextResponse } from "next/server";

import {
  getDay16State,
  getPublicDay16State,
  requireDay16UserId
} from "@/lib/day16-server";

export async function GET() {
  try {
    const userId = await requireDay16UserId();
    const state = await getDay16State(userId);

    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      const publicState = await getPublicDay16State().catch(() => null);
      return NextResponse.json(
        publicState ?? { error: "Unauthorized" },
        { status: publicState ? 200 : 401 }
      );
    }

    console.error("Day 16 state route failed:", error);
    return NextResponse.json(
      { error: "Failed to load day 16 state." },
      { status: 500 }
    );
  }
}
