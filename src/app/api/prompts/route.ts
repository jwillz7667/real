import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),
        name: prompt.name,
        description: prompt.description,
        instructions: prompt.instructions,
        isDefault: prompt.isDefault,
        tags: prompt.tags,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, instructions, tags, isDefault } = body;

    if (!name || !instructions) {
      return NextResponse.json(
        { error: "Name and instructions are required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.prompt.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const prompt = await prisma.prompt.create({
      data: {
        name,
        description: description || null,
        instructions,
        tags: tags || [],
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({
      prompt: {
        id: prompt.id,
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),
        name: prompt.name,
        description: prompt.description,
        instructions: prompt.instructions,
        isDefault: prompt.isDefault,
        tags: prompt.tags,
      },
    });
  } catch (error) {
    console.error("Failed to create prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}
