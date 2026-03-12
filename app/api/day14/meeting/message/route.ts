import { NextResponse } from "next/server";

import { requireDay14UserId, sendDay14Message } from "@/lib/day14-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay14UserId();
    const body = (await request.json().catch(() => null)) as
      | { pairId?: string; text?: string }
      | null;

    if (!body?.pairId) {
      return NextResponse.json({ error: "pairId is required." }, { status: 400 });
    }

    const state = await sendDay14Message(userId, body.pairId, body.text ?? "");
    return NextResponse.json(state);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "Unauthorized"
        : error instanceof Error && error.message === "EMPTY_MESSAGE"
          ? "Введите сообщение перед отправкой."
          : error instanceof Error && error.message === "MESSAGE_TOO_LONG"
            ? "Сообщение не должно быть длиннее 500 символов."
            : error instanceof Error && error.message === "PAIR_NOT_ACTIVE"
              ? "Чат доступен только для активной пары."
              : "Failed to send message.";
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            (error.message === "EMPTY_MESSAGE" ||
              error.message === "MESSAGE_TOO_LONG" ||
              error.message === "PAIR_NOT_ACTIVE")
          ? 400
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
