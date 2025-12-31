import { NextResponse } from "next/server";

export async function GET() {
  const envStatus = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID
      ? `set (starts with ${process.env.TWILIO_ACCOUNT_SID.substring(0, 4)}...)`
      : "MISSING",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN
      ? `set (${process.env.TWILIO_AUTH_TOKEN.length} chars)`
      : "MISSING",
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
      ? `set (${process.env.TWILIO_PHONE_NUMBER})`
      : "MISSING",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
      ? `set (starts with ${process.env.OPENAI_API_KEY.substring(0, 7)}...)`
      : "MISSING",
    DATABASE_URL: process.env.DATABASE_URL
      ? "set"
      : "MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "MISSING",
  };

  // Check for common issues
  const issues: string[] = [];

  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";

  // Check if values have quotes (common Railway mistake)
  if (sid.startsWith('"') || sid.startsWith("'")) {
    issues.push("TWILIO_ACCOUNT_SID appears to have quotes - remove them in Railway");
  }
  if (token.startsWith('"') || token.startsWith("'")) {
    issues.push("TWILIO_AUTH_TOKEN appears to have quotes - remove them in Railway");
  }

  // Check SID format
  if (sid && !sid.startsWith("AC")) {
    issues.push(`TWILIO_ACCOUNT_SID should start with 'AC', got '${sid.substring(0, 4)}'`);
  }

  // Check token length (should be 32 chars)
  if (token && token.length !== 32) {
    issues.push(`TWILIO_AUTH_TOKEN should be 32 chars, got ${token.length} chars`);
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envStatus,
    issues: issues.length > 0 ? issues : "none detected",
  });
}
