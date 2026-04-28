import { NextResponse } from "next/server";
import { db, judges } from "@/db";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allJudges = await db.query.judges.findMany({
      with: {
        rubric: true,
      },
      orderBy: [desc(judges.createdAt)],
    });
    return NextResponse.json({ data: allJudges });
  } catch (error) {
    console.error("Failed to fetch judges:", error);
    return NextResponse.json(
      { error: "Failed to fetch judges" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, model, systemPrompt, temperature, rubricId, mode } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }

    if (!rubricId) {
      return NextResponse.json({ error: "Rubric ID is required" }, { status: 400 });
    }

    const [newJudge] = await db
      .insert(judges)
      .values({
        name,
        description,
        model,
        systemPrompt,
        temperature,
        rubricId,
        mode,
      })
      .returning();

    return NextResponse.json({ data: newJudge });
  } catch (error) {
    console.error("Failed to create judge:", error);
    return NextResponse.json(
      { error: "Failed to create judge" },
      { status: 500 },
    );
  }
}
