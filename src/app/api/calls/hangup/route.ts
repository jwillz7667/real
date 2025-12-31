import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

export async function POST(req: NextRequest) {
  try {
    const { callId } = await req.json();

    if (!callId) {
      return NextResponse.json(
        { success: false, error: "Call ID required" },
        { status: 400 }
      );
    }

    // Get call from database
    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return NextResponse.json(
        { success: false, error: "Call not found" },
        { status: 404 }
      );
    }

    if (!call.twilioCallSid) {
      return NextResponse.json(
        { success: false, error: "No Twilio call SID" },
        { status: 400 }
      );
    }

    // End the call via Twilio
    await client.calls(call.twilioCallSid).update({
      status: "completed",
    });

    // Update database
    await prisma.call.update({
      where: { id: callId },
      data: {
        status: "completed",
        endedAt: new Date(),
      },
    });

    // Log event
    await prisma.callEvent.create({
      data: {
        callId,
        source: "system",
        eventType: "call.hangup",
        direction: "outgoing",
        payload: { reason: "user_initiated" },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to hang up call:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to hang up call",
      },
      { status: 500 }
    );
  }
}
