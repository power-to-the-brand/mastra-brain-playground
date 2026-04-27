import { NextResponse } from "next/server";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      const existing = await db
        .select()
        .from(modules)
        .where(eq(modules.name, trimmedName));
      if (existing.length > 0 && existing[0].id !== id) {
        return NextResponse.json({ error: "Module name already exists" }, { status: 409 });
      }
    }

    const [updated] = await db
      .update(modules)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        updatedAt: new Date(),
      })
      .where(eq(modules.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await db.delete(modules).where(eq(modules.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}
