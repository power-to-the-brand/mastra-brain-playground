import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { ilike, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";

  try {
    const results = await db.query.agents.findMany({
      where: or(
        ilike(agents.name, `%${query}%`),
        ilike(agents.description, `%${query}%`)
      ),
      limit: 10,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Agent search error:", error);
    return NextResponse.json({ error: "Failed to search agents" }, { status: 500 });
  }
}
