import { NextResponse } from "next/server";

import { getDay15Recipients, requireDay15UserId } from "@/lib/day15-server";

export async function GET(request: Request) {
  try {
    const userId = await requireDay15UserId();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? "12")));

    const page = await getDay15Recipients(
      userId,
      query,
      Number.isFinite(offset) && offset > 0 ? offset : 0,
      limit
    );

    return NextResponse.json(page);
  } catch (error) {
    console.error("Day 15 recipients route failed:", error);
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to load recipients." },
      { status }
    );
  }
}
