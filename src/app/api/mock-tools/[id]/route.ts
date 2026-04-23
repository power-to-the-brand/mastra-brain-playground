import { NextResponse } from "next/server";
import { db } from "@/db";
import { mockTools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      toolId,
      name,
      description,
      inputSchema,
      mockMode,
      mockFixedResponse,
      mockSimulationPrompt,
      mockSimulationModel,
    } = body;

    const [updated] = await db
      .update(mockTools)
      .set({
        toolId,
        name,
        description,
        inputSchema,
        mockMode,
        mockFixedResponse,
        mockSimulationPrompt,
        mockSimulationModel,
        updatedAt: new Date(),
      })
      .where(eq(mockTools.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Mock tool not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating mock tool:", error);
    return NextResponse.json(
      { error: "Failed to update mock tool" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.delete(mockTools).where(eq(mockTools.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mock tool:", error);
    return NextResponse.json(
      { error: "Failed to delete mock tool" },
      { status: 500 },
    );
  }
}
