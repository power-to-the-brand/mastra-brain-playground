import { NextRequest, NextResponse } from "next/server";
import { db, judgeResults, judges, runs, scenarios } from "@/db";
import { eq, desc, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(judgeResults);

    // Get paginated results with related data
    const results = await db
      .select({
        result: judgeResults,
        judge: judges,
        run: runs,
        scenario: scenarios,
      })
      .from(judgeResults)
      .leftJoin(judges, eq(judgeResults.judgeId, judges.id))
      .leftJoin(runs, eq(judgeResults.runId, runs.id))
      .leftJoin(scenarios, eq(runs.scenarioId, scenarios.id))
      .orderBy(desc(judgeResults.evaluatedAt))
      .limit(limit)
      .offset(offset);

    const data = results.map((row) => ({
      ...row.result,
      judge: row.judge
        ? { id: row.judge.id, name: row.judge.name, mode: row.judge.mode }
        : null,
      run: row.run
        ? {
            id: row.run.id,
            status: row.run.status,
            scenarioId: row.run.scenarioId,
          }
        : null,
      scenario: row.scenario
        ? { id: row.scenario.id, name: row.scenario.name }
        : null,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch judge results:", error);
    return NextResponse.json(
      { error: "Failed to fetch judge results" },
      { status: 500 },
    );
  }
}