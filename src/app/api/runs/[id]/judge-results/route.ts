import { NextRequest, NextResponse } from "next/server";
import { db, judgeResults, judges, runJudges } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params;

    const results = await db
      .select({
        result: judgeResults,
        judge: judges,
        assignment: runJudges,
      })
      .from(judgeResults)
      .where(eq(judgeResults.runId, runId))
      .leftJoin(judges, eq(judgeResults.judgeId, judges.id))
      .leftJoin(runJudges, eq(judgeResults.runJudgeId, runJudges.id))
      .orderBy(desc(judgeResults.evaluatedAt));

    const data = results.map((row) => ({
      ...row.result,
      judge: row.judge
        ? { id: row.judge.id, name: row.judge.name, mode: row.judge.mode }
        : null,
      assignment: row.assignment
        ? {
            id: row.assignment.id,
            autoEvaluate: row.assignment.autoEvaluate,
            status: row.assignment.status,
          }
        : null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch judge results for run:", error);
    return NextResponse.json(
      { error: "Failed to fetch judge results" },
      { status: 500 },
    );
  }
}