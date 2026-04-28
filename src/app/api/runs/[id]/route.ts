import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { runs, scenarios } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { triggerAutoEvaluation } from "@/lib/judge-evaluator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await db
      .select({
        run: runs,
        scenario: scenarios,
      })
      .from(runs)
      .leftJoin(scenarios, eq(runs.scenarioId, scenarios.id))
      .where(eq(runs.id, id));

    if (result.length === 0) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const { run, scenario } = result[0];

    return NextResponse.json({ ...run, scenario });
  } catch (error) {
    console.error("Failed to fetch run:", error);
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { messages, status } = body;

    // ── Handle status update ──────────────────────────────────────────────
    if (status) {
      const currentRun = await db
        .select({ status: runs.status })
        .from(runs)
        .where(eq(runs.id, id));

      if (currentRun.length === 0) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }

      const previousStatus = currentRun[0].status;

      await db
        .update(runs)
        .set({ status, updatedAt: new Date() })
        .where(eq(runs.id, id));

      // Trigger auto-evaluation when run transitions to "completed"
      if (status === "completed" && previousStatus !== "completed") {
        // Fire and forget — evaluation runs async
        triggerAutoEvaluation(id).catch((err) => {
          console.error(`Auto-evaluation failed for run ${id}:`, err);
        });
      }

      return NextResponse.json({ success: true, status });
    }

    // ── Handle message append ─────────────────────────────────────────────
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array or status is required" },
        { status: 400 }
      );
    }

    // Fetch existing messages to deduplicate by id
    const currentRun = await db
      .select({ messages: runs.messages })
      .from(runs)
      .where(eq(runs.id, id));

    const existingMessages = (currentRun[0]?.messages as Array<{ id?: string }>) || [];
    const existingIds = new Set(existingMessages.map((m) => m.id).filter(Boolean));

    // Only append messages whose id is not already present
    const uniqueNewMessages = messages.filter(
      (m: any) => !m.id || !existingIds.has(m.id)
    );

    if (uniqueNewMessages.length > 0) {
      await db
        .update(runs)
        .set({
          messages: sql`COALESCE(messages, '[]'::jsonb) || ${JSON.stringify(uniqueNewMessages)}::jsonb`,
        })
        .where(eq(runs.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to patch run:", error);
    return NextResponse.json(
      { error: "Failed to update run" },
      { status: 500 }
    );
  }
}
