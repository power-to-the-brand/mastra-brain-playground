import { NextRequest, NextResponse } from "next/server";
import { db, runJudges } from "@/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const assignments = await db.query.runJudges.findMany({
      where: eq(runJudges.runId, id),
      with: {
        judge: {
          with: { rubric: true },
        },
        results: {
          orderBy: (judgeResults, { desc }) => [desc(judgeResults.createdAt)],
          limit: 1,
        },
      },
      orderBy: (runJudges, { desc }) => [desc(runJudges.createdAt)],
    });

    const data = assignments.map((a) => ({
      ...a,
      latestResult: a.results?.[0] || null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch judge assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch judge assignments" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params;
    const body = await request.json();
    const { judgeIds, autoEvaluate = false } = body;

    if (!Array.isArray(judgeIds) || judgeIds.length === 0) {
      return NextResponse.json(
        { error: "judgeIds array is required" },
        { status: 400 },
      );
    }

    // Check for existing assignments to skip duplicates
    const existing = await db.query.runJudges.findMany({
      where: eq(runJudges.runId, runId),
    });
    const existingJudgeIds = new Set(existing.map((e) => e.judgeId));

    const newAssignments = judgeIds
      .filter((jid: string) => !existingJudgeIds.has(jid))
      .map((judgeId: string) => ({
        runId,
        judgeId,
        autoEvaluate,
        status: "pending" as const,
      }));

    let created: any[] = [];
    if (newAssignments.length > 0) {
      created = await db.insert(runJudges).values(newAssignments).returning();
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to assign judges:", error);
    return NextResponse.json(
      { error: "Failed to assign judges" },
      { status: 500 },
    );
  }
}