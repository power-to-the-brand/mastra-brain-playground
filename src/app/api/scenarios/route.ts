import { NextRequest, NextResponse } from "next/server";
import { db, scenarios } from "@/db";
import { eq, desc, count } from "drizzle-orm";

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

// GET /api/scenarios - List all scenarios with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page = 1, perPage = 20 } = getPagination(searchParams);

    // Count total records
    const [{ count: total }] = await db
      .select({ count: count(scenarios.id) })
      .from(scenarios);

    // Fetch scenarios with pagination, ordered by createdAt descending
    const offset = (page - 1) * perPage;
    const scenariosData = await db
      .select()
      .from(scenarios)
      .orderBy(desc(scenarios.createdAt))
      .limit(perPage)
      .offset(offset);

    const meta = calculatePagination(total, page, perPage);

    return NextResponse.json({
      data: scenariosData,
      meta,
    });
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenarios" },
      { status: 500 },
    );
  }
}

// POST /api/scenarios - Save a new scenario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid name field. Expected a string." },
        { status: 400 },
      );
    }

    if (
      !body.conversationMessages ||
      !Array.isArray(body.conversationMessages)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid conversationMessages field. Expected an array.",
        },
        { status: 400 },
      );
    }

    if (!body.srData || !Array.isArray(body.srData)) {
      return NextResponse.json(
        { error: "Missing or invalid srData field. Expected an array." },
        { status: 400 },
      );
    }

    if (
      !body.pastSupplierConversation ||
      !Array.isArray(body.pastSupplierConversation)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid pastSupplierConversation field. Expected an array.",
        },
        { status: 400 },
      );
    }

    // Insert the scenario
    const [newScenario] = await db
      .insert(scenarios)
      .values({
        name: body.name,
        conversationMessages: body.conversationMessages,
        srData: body.srData,
        pastSupplierConversation: body.pastSupplierConversation,
        ...(body.products !== undefined ? { products: body.products } : {}),
      })
      .returning();

    return NextResponse.json({ data: newScenario }, { status: 201 });
  } catch (error) {
    console.error("Error saving scenario:", error);
    return NextResponse.json(
      { error: "Failed to save scenario" },
      { status: 500 },
    );
  }
}

// PUT /api/scenarios - Update a scenario by ID
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.id || typeof body.id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid id field. Expected a string." },
        { status: 400 },
      );
    }

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid name field. Expected a string." },
        { status: 400 },
      );
    }

    if (
      !body.conversationMessages ||
      !Array.isArray(body.conversationMessages)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid conversationMessages field. Expected an array.",
        },
        { status: 400 },
      );
    }

    if (!body.srData || !Array.isArray(body.srData)) {
      return NextResponse.json(
        { error: "Missing or invalid srData field. Expected an array." },
        { status: 400 },
      );
    }

    if (
      !body.pastSupplierConversation ||
      !Array.isArray(body.pastSupplierConversation)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid pastSupplierConversation field. Expected an array.",
        },
        { status: 400 },
      );
    }

    // Check if scenario exists first
    const existing = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, body.id));
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    // Update the scenario
    const [updatedScenario] = await db
      .update(scenarios)
      .set({
        name: body.name,
        conversationMessages: body.conversationMessages,
        srData: body.srData,
        pastSupplierConversation: body.pastSupplierConversation,
        ...(body.products !== undefined ? { products: body.products } : {}),
        updatedAt: new Date(),
      })
      .where(eq(scenarios.id, body.id))
      .returning();

    return NextResponse.json({ data: updatedScenario }, { status: 200 });
  } catch (error) {
    console.error("Error updating scenario:", error);
    return NextResponse.json(
      { error: "Failed to update scenario" },
      { status: 500 },
    );
  }
}

// DELETE /api/scenarios - Delete a scenario by ID
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 },
      );
    }

    // Check if scenario exists first
    const existing = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, id));
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    // Delete the scenario
    await db.delete(scenarios).where(eq(scenarios.id, id));

    return NextResponse.json(
      { message: "Scenario deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting scenario:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 },
    );
  }
}
