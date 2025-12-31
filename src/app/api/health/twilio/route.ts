import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return NextResponse.json({
      success: false,
      error: "Missing credentials",
      details: {
        accountSid: accountSid ? "set" : "MISSING",
        authToken: authToken ? "set" : "MISSING",
      },
    }, { status: 500 });
  }

  try {
    const client = twilio(accountSid, authToken);

    // Try to fetch account info to validate credentials
    const account = await client.api.accounts(accountSid).fetch();

    return NextResponse.json({
      success: true,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
      },
      credentials: {
        sidPrefix: accountSid.substring(0, 6),
        tokenLength: authToken.length,
      },
    });
  } catch (error) {
    const err = error as Error & { code?: number; status?: number };
    return NextResponse.json({
      success: false,
      error: err.message,
      code: err.code,
      status: err.status,
      credentials: {
        sidPrefix: accountSid.substring(0, 6),
        sidLength: accountSid.length,
        tokenLength: authToken.length,
        // Check for common issues
        sidHasQuotes: accountSid.includes('"') || accountSid.includes("'"),
        tokenHasQuotes: authToken.includes('"') || authToken.includes("'"),
        sidHasSpaces: accountSid.includes(" "),
        tokenHasSpaces: authToken.includes(" "),
      },
    }, { status: 500 });
  }
}
