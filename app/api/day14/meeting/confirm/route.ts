import { NextResponse } from "next/server";

import {
  getDay14MeetingState,
  getMeetingConfirmationCode,
  requireDay14UserId
} from "@/lib/day14-server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const userId = await requireDay14UserId();
    const body = (await request.json().catch(() => null)) as
      | { pairId?: string; partnerCode?: string }
      | null;
    const pairId = body?.pairId;
    const partnerCode = body?.partnerCode?.trim().toUpperCase();

    if (!pairId) {
      return NextResponse.json({ error: "pairId is required." }, { status: 400 });
    }

    if (!partnerCode) {
      return NextResponse.json({ error: "partnerCode is required." }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    const pairResult = await adminClient
      .from("meeting_pairs")
      .select("id, user_a_id, user_b_id, status")
      .eq("id", pairId)
      .single();

    if (pairResult.error || !pairResult.data) {
      return NextResponse.json({ error: "Pair not found." }, { status: 404 });
    }

    const pair = pairResult.data;
    if (pair.status !== "matched") {
      return NextResponse.json({ error: "Pair is no longer active." }, { status: 400 });
    }

    if (pair.user_a_id !== userId && pair.user_b_id !== userId) {
      return NextResponse.json({ error: "Current user is not a member of this pair." }, { status: 403 });
    }

    const partnerUserId = pair.user_a_id === userId ? pair.user_b_id : pair.user_a_id;
    const expectedPartnerCode = getMeetingConfirmationCode(pairId, partnerUserId);

    if (partnerCode !== expectedPartnerCode) {
      return NextResponse.json(
        { error: "Код партнера неверный. Подтверждение возможно только после реальной встречи." },
        { status: 400 }
      );
    }

    const result = await adminClient.rpc("confirm_meeting_pair", {
      p_pair_id: pairId,
      p_user_id: userId
    });

    if (result.error) {
      throw result.error;
    }

    const state = await getDay14MeetingState(userId);
    return NextResponse.json(state);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message = status === 401 ? "Unauthorized" : "Failed to confirm meeting pair.";

    return NextResponse.json({ error: message }, { status });
  }
}
