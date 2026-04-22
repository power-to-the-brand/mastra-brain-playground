import { NextResponse } from "next/server";
import { db, skills } from "@/db";
import { getFromS3, uploadToS3, deleteFromS3, parseS3Uri } from "@/lib/s3";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const skill = await db.query.skills.findFirst({
      where: eq(skills.id, id),
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Fetch content from S3
    const s3Info = parseS3Uri(skill.s3Location);
    let content = "";
    if (s3Info) {
      content = await getFromS3(s3Info.key);
    }

    return NextResponse.json({ ...skill, content });
  } catch (error) {
    console.error("Failed to fetch skill:", error);
    return NextResponse.json(
      { error: "Failed to fetch skill" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, version, tags, content } = body;

    const existingSkill = await db.query.skills.findFirst({
      where: eq(skills.id, id),
    });

    if (!existingSkill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // 1. Determine the target S3 key
    const normalizedName = (name ?? existingSkill.name)
      .toLowerCase()
      .replace(/\s+/g, "-");
    const newS3Key = `playground/skills/${normalizedName}/SKILL.md`;
    const oldS3Info = parseS3Uri(existingSkill.s3Location);
    const oldS3Key = oldS3Info?.key ?? existingSkill.s3Location;

    // 2. Update S3
    if (oldS3Key !== newS3Key) {
      // Name changed: upload to new key, delete old key
      const contentToUpload =
        content ?? (oldS3Info ? await getFromS3(oldS3Key) : "");
      await uploadToS3(newS3Key, contentToUpload);
      await deleteFromS3(oldS3Key);
    } else if (content !== undefined) {
      // Same key, content changed
      await uploadToS3(newS3Key, content);
    }

    const newS3Uri = `s3://${oldS3Info?.bucket ?? process.env.AWS_S3_BUCKET ?? "mastra-brain-agent-skills"}/${newS3Key}`;

    // 3. Update DB
    const [updatedSkill] = await db
      .update(skills)
      .set({
        name: name ?? existingSkill.name,
        description: description ?? existingSkill.description,
        version: version ?? existingSkill.version,
        tags: tags ?? existingSkill.tags,
        s3Location: newS3Uri,
        updatedAt: new Date(),
      })
      .where(eq(skills.id, id))
      .returning();

    return NextResponse.json(updatedSkill);
  } catch (error) {
    console.error("Failed to update skill:", error);
    return NextResponse.json(
      { error: "Failed to update skill" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existingSkill = await db.query.skills.findFirst({
      where: eq(skills.id, id),
    });

    if (!existingSkill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // 1. Delete from S3
    const s3Info = parseS3Uri(existingSkill.s3Location);
    if (s3Info) {
      await deleteFromS3(s3Info.key);
    }

    // 2. Delete from DB
    await db.delete(skills).where(eq(skills.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete skill:", error);
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 },
    );
  }
}
