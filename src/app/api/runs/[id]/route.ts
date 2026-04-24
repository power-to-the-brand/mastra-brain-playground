import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { runs, scenarios } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    await db
      .update(runs)
      .set({
        messages: sql`COALESCE(messages, '[]'::jsonb) || ${JSON.stringify(messages)}::jsonb`,
      })
      .where(eq(runs.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to patch run messages:", error);
    return NextResponse.json(
      { error: "Failed to update messages" },
      { status: 500 }
    );
  }
}
