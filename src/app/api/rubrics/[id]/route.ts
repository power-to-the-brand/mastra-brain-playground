import { NextResponse } from "next/server";
import { db, rubrics } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rubric = await db.query.rubrics.findFirst({
      where: eq(rubrics.id, id),
    });

    if (!rubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    return NextResponse.json(rubric);
  } catch (error) {
    console.error("Failed to fetch rubric:", error);
    return NextResponse.json(
      { error: "Failed to fetch rubric" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, dimensions, passingThreshold } = body;

    const existingRubric = await db.query.rubrics.findFirst({
      where: eq(rubrics.id, id),
    });

    if (!existingRubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    // Validate dimensions if provided
    if (dimensions !== undefined) {
      if (!Array.isArray(dimensions) || dimensions.length === 0) {
        return NextResponse.json(
          { error: "At least one dimension is required" },
          { status: 400 },
        );
      }

      for (const dim of dimensions) {
        if (!dim.name || dim.weight === undefined || !dim.scoringCriteria) {
          return NextResponse.json(
            {
              error:
                "Each dimension must have name, weight, and scoringCriteria",
            },
            { status: 400 },
          );
        }
      }
    }

    const [updatedRubric] = await db
      .update(rubrics)
      .set({
        name: name ?? existingRubric.name,
        description: description ?? existingRubric.description,
        dimensions: dimensions ?? existingRubric.dimensions,
        passingThreshold:
          passingThreshold !== undefined
            ? passingThreshold
            : existingRubric.passingThreshold,
        updatedAt: new Date(),
      })
      .where(eq(rubrics.id, id))
      .returning();

    return NextResponse.json(updatedRubric);
  } catch (error) {
    console.error("Failed to update rubric:", error);
    return NextResponse.json(
      { error: "Failed to update rubric" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existingRubric = await db.query.rubrics.findFirst({
      where: eq(rubrics.id, id),
    });

    if (!existingRubric) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    await db.delete(rubrics).where(eq(rubrics.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete rubric:", error);
    return NextResponse.json(
      { error: "Failed to delete rubric" },
      { status: 500 },
    );
  }
}
