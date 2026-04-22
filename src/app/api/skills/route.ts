import { NextResponse } from "next/server";
import { db, skills } from "@/db";
import { uploadToS3 } from "@/lib/s3";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allSkills = await db.query.skills.findMany({
      orderBy: [desc(skills.createdAt)],
    });
    return NextResponse.json({ data: allSkills });
  } catch (error) {
    console.error("Failed to fetch skills:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, version, tags, content } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 },
      );
    }

    // 1. Upload to S3
    // Use a stable path: playground/skills/{normalized-name}/SKILL.md
    const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
    const s3Key = `playground/skills/${normalizedName}/SKILL.md`;
    const s3Uri = await uploadToS3(s3Key, content);

    // 2. Save to DB
    const [newSkill] = await db
      .insert(skills)
      .values({
        name,
        description,
        version: version || "1.0.0",
        tags: tags || [],
        s3Location: s3Uri,
      })
      .returning();

    return NextResponse.json(newSkill);
  } catch (error) {
    console.error("Failed to create skill:", error);
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 },
    );
  }
}
