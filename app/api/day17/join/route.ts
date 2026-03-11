import { NextResponse } from "next/server";

import { joinDay17Group, requireDay17UserId } from "@/lib/day17-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay17UserId();
    const body = (await request.json().catch(() => null)) as
      | { inviteCode?: string }
      | null;
    const inviteCode = body?.inviteCode?.trim();

    if (!inviteCode) {
      return NextResponse.json(
        { error: "inviteCode is required." },
        { status: 400 }
      );
    }

    const state = await joinDay17Group(userId, inviteCode);
    return NextResponse.json(state);
  } catch (error) {
    const lower = error instanceof Error ? error.message.toLowerCase() : "";
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : lower.includes("required") ||
            lower.includes("already belongs") ||
            lower.includes("not found") ||
            lower.includes("full") ||
            lower.includes("completed")
          ? 400
          : 500;
    const message =
      status === 401
        ? "Unauthorized"
        : error instanceof Error
          ? error.message
          : "Failed to join day 17 group.";

    if (status === 500) {
      console.error("Day 17 join route failed:", error);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
