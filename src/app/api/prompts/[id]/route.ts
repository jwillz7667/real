import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

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
    console.error("Failed to fetch prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, instructions, tags, isDefault } = body;

    const existingPrompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault && !existingPrompt.isDefault) {
      await prisma.prompt.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        name: name ?? existingPrompt.name,
        description: description !== undefined ? description : existingPrompt.description,
        instructions: instructions ?? existingPrompt.instructions,
        tags: tags ?? existingPrompt.tags,
        isDefault: isDefault ?? existingPrompt.isDefault,
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
    console.error("Failed to update prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingPrompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    await prisma.prompt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
