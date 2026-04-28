import { NextRequest, NextResponse } from "next/server";
import { db, runJudges } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import { evaluateRunJudge } from "@/lib/judge-evaluator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params;
    const body = await request.json();
    const { judgeIds } = body;

    // Find assignments to evaluate
    let assignments;
    if (judgeIds && Array.isArray(judgeIds) && judgeIds.length > 0) {
      assignments = await db.query.runJudges.findMany({
        where: and(
          eq(runJudges.runId, runId),
          inArray(runJudges.judgeId, judgeIds),
        ),
      });
    } else {
      // Evaluate all pending or failed assignments
      assignments = await db.query.runJudges.findMany({
        where: and(
          eq(runJudges.runId, runId),
          inArray(runJudges.status, ["pending", "failed"]),
        ),
      });
    }

    if (assignments.length === 0) {
      return NextResponse.json(
        { error: "No eligible judge assignments found" },
        { status: 404 },
      );
    }

    // Transition to queued and trigger async evaluation
    const results = [];
    for (const assignment of assignments) {
      await db
        .update(runJudges)
        .set({ status: "queued", updatedAt: new Date() })
        .where(eq(runJudges.id, assignment.id));

      // Fire and forget — evaluation runs async
      evaluateRunJudge(assignment.id).catch((err) => {
        console.error(`Evaluation failed for ${assignment.id}:`, err);
      });

      results.push({ runJudgeId: assignment.id, status: "queued" });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Failed to trigger evaluation:", error);
    return NextResponse.json(
      { error: "Failed to trigger evaluation" },
      { status: 500 },
    );
  }
}