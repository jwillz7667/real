import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const call = await prisma.call.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({
      call: {
        id: call.id,
        createdAt: call.createdAt.toISOString(),
        endedAt: call.endedAt?.toISOString() || null,
        phoneNumber: call.phoneNumber,
        direction: call.direction,
        status: call.status,
        durationSeconds: call.durationSeconds,
        twilioCallSid: call.twilioCallSid,
        recordingUrl: call.recordingUrl,
        recordingDuration: call.recordingDuration,
        configSnapshot: call.configSnapshot,
        totalInputTokens: call.totalInputTokens,
        totalOutputTokens: call.totalOutputTokens,
        estimatedCost: Number(call.estimatedCost),
      },
      events: call.events.map((event) => ({
        id: event.id,
        createdAt: event.createdAt.toISOString(),
        source: event.source,
        eventType: event.eventType,
        direction: event.direction,
        payload: event.payload,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch call:", error);
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    );
  }
}
