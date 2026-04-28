import { NextRequest, NextResponse } from "next/server";
import { db, judges } from "@/db";
import { ilike, or, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") || "";
    const allJudges = await db.query.judges.findMany({
      where: query
        ? or(
            ilike(judges.name, `%${query}%`),
            ilike(judges.description, `%${query}%`),
          )
        : undefined,
      with: { rubric: true },
      orderBy: [desc(judges.createdAt)],
    });

    return NextResponse.json(allJudges);
  } catch (error) {
    console.error("Failed to search judges:", error);
    return NextResponse.json(
      { error: "Failed to search judges" },
      { status: 500 },
    );
  }
}