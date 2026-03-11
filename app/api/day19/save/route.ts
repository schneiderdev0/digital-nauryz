import { NextResponse } from "next/server";

import { DAY19_TREES } from "@/lib/day19";
import { requireDay19UserId, saveDay19Card } from "@/lib/day19-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay19UserId();
    const body = (await request.json().catch(() => null)) as
      | { goal?: string; treeId?: string }
      | null;
    const goal = body?.goal?.trim() ?? "";
    const treeId = body?.treeId?.trim();

    if (!goal) {
      return NextResponse.json({ error: "goal is required." }, { status: 400 });
    }

    if (!treeId || !DAY19_TREES.some((tree) => tree.id === treeId)) {
      return NextResponse.json({ error: "Unknown tree." }, { status: 400 });
    }

    const state = await saveDay19Card(
      userId,
      goal,
      treeId as (typeof DAY19_TREES)[number]["id"]
    );

    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "GOAL_REQUIRED"
          ? 400
          : 500;

    if (status === 500) {
      console.error("Day 19 save route failed:", error);
    }

    return NextResponse.json(
      {
        error:
          status === 401
            ? "Unauthorized"
            : status === 400
              ? "Goal is required."
              : "Failed to save day 19 card."
      },
      { status }
    );
  }
}
