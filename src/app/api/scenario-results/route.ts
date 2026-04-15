import { NextRequest, NextResponse } from "next/server";
import { db, scenarioResults } from "@/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const ScenarioResultSchema = z.object({
  scenarioId: z.string().uuid().optional(),
  finalOutput: z.string(),
  agentName: z.string(),
});

// GET /api/scenario-results?scenarioId=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scenarioId = searchParams.get("scenarioId");

    if (!scenarioId) {
      return NextResponse.json(
        { error: "scenarioId is required" },
        { status: 400 },
      );
    }

    const results = await db
      .select()
      .from(scenarioResults)
      .where(eq(scenarioResults.scenarioId, scenarioId))
      .orderBy(desc(scenarioResults.createdAt));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Error fetching scenario results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 },
    );
  }
}

// POST /api/scenario-results
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ScenarioResultSchema.parse(body);

    const [result] = await db
      .insert(scenarioResults)
      .values({
        scenarioId: validated.scenarioId,
        finalOutput: validated.finalOutput,
        agentName: validated.agentName,
      })
      .returning();

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Error saving scenario result:", error);
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 },
    );
  }
}
