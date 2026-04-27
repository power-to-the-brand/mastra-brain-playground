import { NextResponse } from "next/server";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allModules = await db.select().from(modules).orderBy(modules.name);
    return NextResponse.json({ data: allModules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Module name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check for duplicate name
    const existing = await db.select().from(modules).where(eq(modules.name, trimmedName));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Module name already exists" }, { status: 409 });
    }

    const [newModule] = await db
      .insert(modules)
      .values({
        name: trimmedName,
        description: description || null,
      })
      .returning();

    return NextResponse.json(newModule);
  } catch (error) {
    console.error("Error creating module:", error);
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}
