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

    // Support two formats:
    // 1. { judgeIds: string[], autoEvaluate: boolean } — bulk assign with same autoEvaluate
    // 2. { assignments: { judgeId: string, autoEvaluate: boolean }[] } — per-judge autoEvaluate
    let assignmentsToCreate: Array<{ runId: string; judgeId: string; autoEvaluate: boolean; status: string }> = [];

    if (body.assignments && Array.isArray(body.assignments)) {
      // Per-judge format from the UI
      assignmentsToCreate = body.assignments.map((a: { judgeId: string; autoEvaluate?: boolean }) => ({
        runId,
        judgeId: a.judgeId,
        autoEvaluate: a.autoEvaluate ?? true,
        status: "pending" as const,
      }));
    } else if (body.judgeIds && Array.isArray(body.judgeIds)) {
      // Bulk format
      const autoEvaluate = body.autoEvaluate ?? true;
      assignmentsToCreate = body.judgeIds.map((judgeId: string) => ({
        runId,
        judgeId,
        autoEvaluate,
        status: "pending" as const,
      }));
    } else {
      return NextResponse.json(
        { error: "judgeIds array or assignments array is required" },
        { status: 400 },
      );
    }

    if (assignmentsToCreate.length === 0) {
      return NextResponse.json(
        { error: "No judges to assign" },
        { status: 400 },
      );
    }

    // Check for existing assignments to skip duplicates
    const existing = await db.query.runJudges.findMany({
      where: eq(runJudges.runId, runId),
    });
    const existingJudgeIds = new Set(existing.map((e) => e.judgeId));

    const newAssignments = assignmentsToCreate.filter(
      (a) => !existingJudgeIds.has(a.judgeId),
    );

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