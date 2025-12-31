import { NextRequest, NextResponse } from "next/server";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const callSid = formData.get("CallSid") as string;
  const from = formData.get("From") as string;
  const to = formData.get("To") as string;

  const streamUrl = `${wsUrl.replace("https://", "wss://").replace("http://", "ws://")}/media-stream?direction=inbound&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Hello, you've reached our AI assistant. How can I help you today?</Say>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
      <Parameter name="to" value="${to}" />
      <Parameter name="direction" value="inbound" />
    </Stream>
  </Connect>
</Response>`;

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
