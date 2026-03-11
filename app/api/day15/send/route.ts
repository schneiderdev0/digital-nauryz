import { NextResponse } from "next/server";

import { getDay15State, requireDay15UserId } from "@/lib/day15-server";
import { KINDNESS_TEMPLATES } from "@/lib/day15";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const userId = await requireDay15UserId();
    const body = (await request.json().catch(() => null)) as
      | {
          recipientId?: string;
          templateId?: string;
          message?: string;
        }
      | null;

    const recipientId = body?.recipientId?.trim();
    const templateId = body?.templateId?.trim();
    const message = body?.message?.trim();

    if (!recipientId || !templateId || !message) {
      return NextResponse.json({ error: "recipientId, templateId and message are required." }, { status: 400 });
    }

    if (!KINDNESS_TEMPLATES.some((template) => template.id === templateId)) {
      return NextResponse.json({ error: "Unknown template." }, { status: 400 });
    }

    const adminClient = getSupabaseAdminClient();
    const result = await adminClient.rpc("send_kindness_card", {
      p_sender_id: userId,
      p_recipient_id: recipientId,
      p_template_id: templateId,
      p_message: message
    });

    if (result.error) {
      const lower = result.error.message.toLowerCase();
      const status =
        lower.includes("limit") || lower.includes("yourself") ? 400 : 500;

      return NextResponse.json({ error: result.error.message }, { status });
    }

    const state = await getDay15State(userId);
    return NextResponse.json(state);
  } catch (error) {
    console.error("Day 15 send route failed:", error);
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to send kindness card." },
      { status }
    );
  }
}
