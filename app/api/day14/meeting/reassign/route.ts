import { NextResponse } from "next/server";

import { getDay14MeetingState, requireDay14UserId } from "@/lib/day14-server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const userId = await requireDay14UserId();
    const adminClient = getSupabaseAdminClient();
    const result = await adminClient.rpc("reassign_meeting_pair", {
      p_user_id: userId
    });

    if (result.error) {
      throw result.error;
    }

    const state = await getDay14MeetingState(userId);
    return NextResponse.json(state);
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message = status === 401 ? "Unauthorized" : "Failed to reassign participant.";

    return NextResponse.json({ error: message }, { status });
  }
}
