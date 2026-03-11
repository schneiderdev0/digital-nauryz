import { NextResponse } from "next/server";

import { DAY18_OUTFITS } from "@/lib/day18";
import { registerDay18Capture, requireDay18UserId } from "@/lib/day18-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay18UserId();
    const body = (await request.json().catch(() => null)) as
      | { outfitId?: string }
      | null;
    const outfitId = body?.outfitId?.trim();

    if (!outfitId) {
      return NextResponse.json({ error: "outfitId is required." }, { status: 400 });
    }

    if (!DAY18_OUTFITS.some((outfit) => outfit.id === outfitId)) {
      return NextResponse.json({ error: "Unknown outfit." }, { status: 400 });
    }

    const state = await registerDay18Capture(userId, outfitId as (typeof DAY18_OUTFITS)[number]["id"]);
    return NextResponse.json(state);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;

    if (status === 500) {
      console.error("Day 18 capture route failed:", error);
    }

    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to register day 18 capture." },
      { status }
    );
  }
}
