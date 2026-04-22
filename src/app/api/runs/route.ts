import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { runs, agents, scenarios } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const allRuns = await db
      .select({
        id: runs.id,
        agentId: runs.agentId,
        agentName: agents.name,
        scenarioId: runs.scenarioId,
        scenarioName: scenarios.name,
        status: runs.status,
        verdict: runs.verdict,
        metrics: runs.metrics,
        output: runs.output,
        messages: runs.messages,
        trace: runs.trace,
        createdAt: runs.createdAt,
        updatedAt: runs.updatedAt,
      })
      .from(runs)
      .leftJoin(agents, eq(runs.agentId, agents.id))
      .leftJoin(scenarios, eq(runs.scenarioId, scenarios.id))
      .orderBy(desc(runs.createdAt));

    return NextResponse.json(allRuns);
  } catch (error) {
    console.error("Failed to fetch runs:", error);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, scenarioId, openingMessageOverride } = body;

    if (!agentId || !scenarioId) {
      return NextResponse.json({ error: "agentId and scenarioId are required" }, { status: 400 });
    }

    const [newRun] = await db.insert(runs).values({
      agentId,
      scenarioId,
      openingMessageOverride,
      status: "pending",
    }).returning();

    return NextResponse.json(newRun);
  } catch (error) {
    console.error("Failed to create run:", error);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
}
