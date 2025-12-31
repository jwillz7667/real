import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CallStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;

    if (!callSid) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 });
    }

    // Map Twilio status to Prisma enum (uses underscores, not hyphens)
    const statusMap: Record<string, CallStatus> = {
      initiated: CallStatus.initiated,
      ringing: CallStatus.ringing,
      "in-progress": CallStatus.in_progress,
      completed: CallStatus.completed,
      busy: CallStatus.busy,
      "no-answer": CallStatus.no_answer,
      failed: CallStatus.failed,
      canceled: CallStatus.failed,
    };

    const mappedStatus = statusMap[callStatus] || CallStatus.failed;

    // Find and update call
    const call = await prisma.call.findFirst({
      where: { twilioCallSid: callSid },
    });

    if (call) {
      const updateData: Record<string, unknown> = {
        status: mappedStatus,
      };

      if (callStatus === "completed") {
        updateData.endedAt = new Date();
        if (callDuration) {
          updateData.durationSeconds = parseInt(callDuration, 10);
        }
      }

      if (recordingUrl) {
        updateData.recordingUrl = recordingUrl;
        if (recordingDuration) {
          updateData.recordingDuration = parseInt(recordingDuration, 10);
        }
      }

      await prisma.call.update({
        where: { id: call.id },
        data: updateData,
      });

      // Log status change event
      await prisma.callEvent.create({
        data: {
          callId: call.id,
          source: "twilio",
          eventType: `call.${callStatus}`,
          direction: "incoming",
          payload: {
            callSid,
            callStatus,
            callDuration,
            recordingUrl,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Status callback error:", error);
    return NextResponse.json(
      { error: "Failed to process status" },
      { status: 500 }
    );
  }
}
