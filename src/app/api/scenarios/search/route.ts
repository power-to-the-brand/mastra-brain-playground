import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scenarios } from "@/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";

  try {
    const results = await db.query.scenarios.findMany({
      where: ilike(scenarios.name, `%${query}%`),
      limit: 10,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Scenario search error:", error);
    return NextResponse.json({ error: "Failed to search scenarios" }, { status: 500 });
  }
}
