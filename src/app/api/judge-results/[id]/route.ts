import { NextRequest, NextResponse } from "next/server";
import { db, judgeResults, judgeTurnResults, judges, runJudges } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await db.query.judgeResults.findFirst({
      where: eq(judgeResults.id, id),
      with: {
        judge: {
          columns: { id: true, name: true, mode: true },
        },
        runJudge: {
          columns: { id: true, autoEvaluate: true, status: true },
        },
        turnResults: {
          orderBy: (turnResults, { asc }) => [asc(turnResults.turnIndex)],
        },
      },
    });

    if (!result) {
      return NextResponse.json(
        { error: "Judge result not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Failed to fetch judge result:", error);
    return NextResponse.json(
      { error: "Failed to fetch judge result" },
      { status: 500 },
    );
  }
}