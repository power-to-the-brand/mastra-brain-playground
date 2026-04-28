import { NextResponse } from "next/server";
import { db, rubrics } from "@/db";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allRubrics = await db.query.rubrics.findMany({
      orderBy: [desc(rubrics.createdAt)],
    });
    return NextResponse.json({ data: allRubrics });
  } catch (error) {
    console.error("Failed to fetch rubrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch rubrics" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, dimensions, passingThreshold } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!dimensions || !Array.isArray(dimensions) || dimensions.length === 0) {
      return NextResponse.json(
        { error: "At least one dimension is required" },
        { status: 400 },
      );
    }

    // Validate dimensions
    for (const dim of dimensions) {
      if (!dim.name || dim.weight === undefined || !dim.scoringCriteria) {
        return NextResponse.json(
          {
            error: "Each dimension must have name, weight, and scoringCriteria",
          },
          { status: 400 },
        );
      }
    }

    const [newRubric] = await db
      .insert(rubrics)
      .values({
        name,
        description,
        dimensions,
        passingThreshold,
      })
      .returning();

    return NextResponse.json(newRubric);
  } catch (error) {
    console.error("Failed to create rubric:", error);
    return NextResponse.json(
      { error: "Failed to create rubric" },
      { status: 500 },
    );
  }
}
