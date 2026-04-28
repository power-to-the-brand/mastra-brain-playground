import { NextRequest, NextResponse } from "next/server";
import { db, runJudges } from "@/db";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; judgeId: string }> },
) {
  try {
    const { id: runId, judgeId } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(runJudges)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(and(eq(runJudges.runId, runId), eq(runJudges.judgeId, judgeId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Failed to update assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; judgeId: string }> },
) {
  try {
    const { id: runId, judgeId } = await params;

    const [deleted] = await db
      .delete(runJudges)
      .where(and(eq(runJudges.runId, runId), eq(runJudges.judgeId, judgeId)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove assignment" },
      { status: 500 },
    );
  }
}