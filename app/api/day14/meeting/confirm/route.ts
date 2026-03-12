import { NextResponse } from "next/server";

import {
  confirmDay14Meeting,
  extractDay14QrData,
  requireDay14UserId
} from "@/lib/day14-server";

export async function POST(request: Request) {
  try {
    const userId = await requireDay14UserId();
    const body = (await request.json().catch(() => null)) as
      | { pairId?: string; partnerCode?: string; scannedPayload?: string }
      | null;
    const pairId = body?.pairId;
    const scannedData = body?.scannedPayload
      ? extractDay14QrData(body.scannedPayload)
      : null;
    const effectivePairId = pairId ?? scannedData?.pairId ?? null;
    const partnerCode =
      scannedData?.partnerCode ?? body?.partnerCode?.trim().toUpperCase() ?? null;

    if (!effectivePairId) {
      return NextResponse.json({ error: "pairId is required." }, { status: 400 });
    }

    if (!partnerCode) {
      return NextResponse.json({ error: "partnerCode is required." }, { status: 400 });
    }

    const state = await confirmDay14Meeting(userId, effectivePairId, partnerCode);
    return NextResponse.json(state);
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error &&
            (error.message === "INVALID_PARTNER_CODE" ||
              error.message === "PAIR_NOT_ACTIVE")
          ? 400
          : error instanceof Error && error.message === "PAIR_FORBIDDEN"
            ? 403
            : error instanceof Error && error.message === "PAIR_NOT_FOUND"
              ? 404
              : 500;
    const message =
      status === 401
        ? "Unauthorized"
        : error instanceof Error && error.message === "INVALID_PARTNER_CODE"
          ? "QR или код партнера неверный. Подтверждение возможно только после реальной встречи."
          : error instanceof Error && error.message === "PAIR_NOT_ACTIVE"
            ? "Пара уже закрыта или больше недоступна."
            : status === 403
              ? "Current user is not a member of this pair."
              : status === 404
                ? "Pair not found."
                : "Failed to confirm meeting pair.";

    return NextResponse.json({ error: message }, { status });
  }
}
