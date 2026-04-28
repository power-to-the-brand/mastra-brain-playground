import { NextResponse } from "next/server";
import { db, judges } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const judge = await db.query.judges.findFirst({
      where: eq(judges.id, id),
      with: {
        rubric: true,
      },
    });

    if (!judge) {
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });
    }

    return NextResponse.json({ data: judge });
  } catch (error) {
    console.error("Failed to fetch judge:", error);
    return NextResponse.json(
      { error: "Failed to fetch judge" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updatedJudge] = await db
      .update(judges)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(judges.id, id))
      .returning();

    if (!updatedJudge) {
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updatedJudge });
  } catch (error) {
    console.error("Failed to update judge:", error);
    return NextResponse.json(
      { error: "Failed to update judge" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(request, { params });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [deletedJudge] = await db.delete(judges).where(eq(judges.id, id)).returning();

    if (!deletedJudge) {
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete judge:", error);
    return NextResponse.json(
      { error: "Failed to delete judge" },
      { status: 500 },
    );
  }
}
