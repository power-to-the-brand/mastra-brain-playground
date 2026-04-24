import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { runs, agents, scenarios } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

// Helper to build pagination
interface PaginationParams {
  page?: number;
  perPage?: number;
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

function getPagination(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("perPage") || "10", 10);

  return {
    page: isNaN(page) ? 1 : page,
    perPage: isNaN(perPage) ? 10 : perPage,
  };
}

function calculatePagination(
  total: number,
  page: number,
  perPage: number,
): PaginatedResult<unknown>["meta"] {
  const totalPages = Math.ceil(total / perPage);

  return {
    total,
    page,
    perPage,
    totalPages,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page = 1, perPage = 10 } = getPagination(searchParams);

    // Count total records
    const [{ count: total }] = await db
      .select({ count: count(runs.id) })
      .from(runs);

    // Fetch runs with pagination, ordered by createdAt descending
    const offset = (page - 1) * perPage;
    const allRuns = await db
      .select({
        id: runs.id,
        agentId: runs.agentId,
        agentName: agents.name,
        scenarioId: runs.scenarioId,
        scenarioName: scenarios.name,
        status: runs.status,
        verdict: runs.verdict,
        metrics: runs.metrics,
      })
      .from(runs)
      .leftJoin(agents, eq(runs.agentId, agents.id))
      .leftJoin(scenarios, eq(runs.scenarioId, scenarios.id))
      .orderBy(desc(runs.createdAt))
      .limit(perPage)
      .offset(offset);

    const meta = calculatePagination(total, page, perPage);

    return NextResponse.json({
      data: allRuns,
      meta,
    });
  } catch (error) {
    console.error("Failed to fetch runs:", error);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, scenarioId, openingMessageOverride } = body;

    if (!agentId || !scenarioId) {
      return NextResponse.json({ error: "agentId and scenarioId are required" }, { status: 400 });
    }

    const [newRun] = await db.insert(runs).values({
      agentId,
      scenarioId,
      openingMessageOverride,
      status: "pending",
    }).returning();

    return NextResponse.json(newRun);
  } catch (error) {
    console.error("Failed to create run:", error);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
}
