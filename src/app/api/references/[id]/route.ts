import { NextResponse } from "next/server";
import { db, references } from "@/db";
import { getFromS3, uploadToS3, deleteFromS3, parseS3Uri } from "@/lib/s3";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reference = await db.query.references.findFirst({
      where: eq(references.id, id),
    });

    if (!reference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 },
      );
    }

    // Fetch content from S3
    const s3Info = parseS3Uri(reference.s3Location);
    let content = "";
    if (s3Info) {
      content = await getFromS3(s3Info.key);
    }

    return NextResponse.json({ ...reference, content });
  } catch (error) {
    console.error("Failed to fetch reference:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference" },
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
    const { name, description, content } = body;

    const existingReference = await db.query.references.findFirst({
      where: eq(references.id, id),
    });

    if (!existingReference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 },
      );
    }

    // 1. Determine the target S3 key
    const normalizedName = (name ?? existingReference.name)
      .toLowerCase()
      .replace(/\s+/g, "-");
    const newS3Key = `playground/references/${normalizedName}.md`;
    const oldS3Info = parseS3Uri(existingReference.s3Location);
    const oldS3Key = oldS3Info?.key ?? existingReference.s3Location;

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
    const [updatedReference] = await db
      .update(references)
      .set({
        name: name ?? existingReference.name,
        description: description ?? existingReference.description,
        s3Location: newS3Uri,
        updatedAt: new Date(),
      })
      .where(eq(references.id, id))
      .returning();

    return NextResponse.json(updatedReference);
  } catch (error) {
    console.error("Failed to update reference:", error);
    return NextResponse.json(
      { error: "Failed to update reference" },
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
    const existingReference = await db.query.references.findFirst({
      where: eq(references.id, id),
    });

    if (!existingReference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 },
      );
    }

    // 1. Delete from S3
    const s3Info = parseS3Uri(existingReference.s3Location);
    if (s3Info) {
      await deleteFromS3(s3Info.key);
    }

    // 2. Delete from DB
    await db.delete(references).where(eq(references.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete reference:", error);
    return NextResponse.json(
      { error: "Failed to delete reference" },
      { status: 500 },
    );
  }
}
