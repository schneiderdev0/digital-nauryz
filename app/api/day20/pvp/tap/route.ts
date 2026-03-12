import { NextResponse } from "next/server";

import { registerDay20PvpTaps, requireDay20UserId } from "@/lib/day20-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay20UserId();
    const body = (await request.json().catch(() => null)) as
      | { roomId?: string; tapCount?: number }
      | null;
    const roomId = body?.roomId?.trim() ?? "";
    const tapCount = Number(body?.tapCount ?? 0);

    if (!roomId || !Number.isFinite(tapCount) || tapCount <= 0) {
      return NextResponse.json({ error: "Invalid tap payload." }, { status: 400 });
    }

    await registerDay20PvpTaps(userId, roomId, tapCount);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "RACE_NOT_FOUND"
          ? 404
          : 500;

    if (status === 500) {
      console.error("Day 20 tap route failed:", error);
    }

    return NextResponse.json(
      {
        error:
          status === 401
            ? "Сессия Telegram не подтверждена. Откройте мини-приложение заново."
            : "Failed to register tap."
      },
      { status }
    );
  }
}
