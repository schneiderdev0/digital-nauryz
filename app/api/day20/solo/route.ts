import { NextResponse } from "next/server";

import { requireDay20UserId, saveDay20SoloRun } from "@/lib/day20-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay20UserId();
    const body = (await request.json().catch(() => null)) as
      | { taps?: number }
      | null;
    const taps = Number(body?.taps ?? 0);

    if (!Number.isFinite(taps) || taps < 0) {
      return NextResponse.json({ error: "Invalid taps." }, { status: 400 });
    }

    const state = await saveDay20SoloRun(userId, taps);
    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;

    if (status === 500) {
      console.error("Day 20 solo route failed:", error);
    }

    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to save solo run." },
      { status }
    );
  }
}
