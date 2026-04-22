import { NextResponse } from "next/server";
import { db, references } from "@/db";
import { uploadToS3 } from "@/lib/s3";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allReferences = await db.query.references.findMany({
      orderBy: [desc(references.createdAt)],
    });
    return NextResponse.json({ data: allReferences });
  } catch (error) {
    console.error("Failed to fetch references:", error);
    return NextResponse.json(
      { error: "Failed to fetch references" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, content } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 },
      );
    }

    // 1. Upload to S3
    // Use a stable path: playground/references/{normalized-name}.md
    const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
    const s3Key = `playground/references/${normalizedName}.md`;
    const s3Uri = await uploadToS3(s3Key, content);

    // 2. Save to DB
    const [newReference] = await db
      .insert(references)
      .values({
        name,
        description,
        s3Location: s3Uri,
      })
      .returning();

    return NextResponse.json(newReference);
  } catch (error) {
    console.error("Failed to create reference:", error);
    return NextResponse.json(
      { error: "Failed to create reference" },
      { status: 500 },
    );
  }
}
