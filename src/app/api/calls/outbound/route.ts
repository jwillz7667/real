import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import type { OutboundCallRequest } from "@/types";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(`Missing Twilio credentials. SID: ${accountSid ? 'set' : 'missing'}, Token: ${authToken ? 'set' : 'missing'}`);
  }

  return twilio(accountSid, authToken);
}

export async function POST(req: NextRequest) {
  try {
    const body: OutboundCallRequest = await req.json();
    const { phoneNumber, config, recordCall } = body;

    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://localhost:3001";

    if (!twilioPhoneNumber) {
      return NextResponse.json(
        { success: false, error: "TWILIO_PHONE_NUMBER not configured" },
        { status: 500 }
      );
    }

    if (!publicUrl) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_APP_URL not configured" },
        { status: 500 }
      );
    }

    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Create call record in database
    const call = await prisma.call.create({
      data: {
        phoneNumber,
        direction: "outbound",
        status: "initiated",
        configSnapshot: config as object,
      },
    });

    // Build WebSocket URL with config
    const configParam = encodeURIComponent(JSON.stringify(config));
    const streamUrl = `${wsUrl.replace("https://", "wss://").replace("http://", "ws://")}/media-stream?callId=${call.id}&config=${configParam}&record=${recordCall}`;

    // Escape for XML (& must be &amp; in XML attributes)
    const xmlSafeUrl = streamUrl.replace(/&/g, "&amp;");

    // Create TwiML for the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${xmlSafeUrl}">
      <Parameter name="callId" value="${call.id}" />
      <Parameter name="direction" value="outbound" />
    </Stream>
  </Connect>
</Response>`;

    // Get Twilio client
    const client = getTwilioClient();

    // Initiate the call
    const twilioCall = await client.calls.create({
      to: phoneNumber,
      from: twilioPhoneNumber,
      twiml,
      statusCallback: `${publicUrl}/api/calls/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      record: recordCall,
    });

    // Update call with Twilio SID
    await prisma.call.update({
      where: { id: call.id },
      data: { twilioCallSid: twilioCall.sid },
    });

    // Log event
    await prisma.callEvent.create({
      data: {
        callId: call.id,
        source: "system",
        eventType: "call.initiated",
        direction: "outgoing",
        payload: JSON.parse(JSON.stringify({
          twilioCallSid: twilioCall.sid,
          phoneNumber,
          config,
        })),
      },
    });

    return NextResponse.json({
      success: true,
      callId: call.id,
      twilioCallSid: twilioCall.sid,
      status: "initiated",
    });
  } catch (error) {
    console.error("Failed to initiate call:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate call",
      },
      { status: 500 }
    );
  }
}
