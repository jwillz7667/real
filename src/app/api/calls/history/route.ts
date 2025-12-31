import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (direction && direction !== "all") {
      where.direction = direction;
    }

    if (search) {
      where.phoneNumber = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.call.count({ where }),
    ]);

    return NextResponse.json({
      calls: calls.map((call) => ({
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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch call history:", error);
    return NextResponse.json(
      { error: "Failed to fetch call history" },
      { status: 500 }
    );
  }
}
