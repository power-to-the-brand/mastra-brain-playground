import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { uploadS3Buffer } from "@/lib/s3";
import { eq } from "drizzle-orm";

interface ImportFile {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetPrefix,
      files,
    }: { targetPrefix: string; files: ImportFile[] } = body;

    if (!targetPrefix || !Array.isArray(files)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // 1. Upload all files to S3
    const uploaded: string[] = [];
    for (const file of files) {
      const key = targetPrefix.endsWith("/")
        ? `${targetPrefix}${file.path}`
        : `${targetPrefix}/${file.path}`;
      const buffer =
        file.encoding === "base64"
          ? Buffer.from(file.content, "base64")
          : Buffer.from(file.content, "utf8");
      const contentType = key.endsWith(".md")
        ? "text/markdown"
        : key.endsWith(".py")
          ? "text/x-python"
          : "application/octet-stream";
      await uploadS3Buffer(key, buffer, contentType);
      uploaded.push(key);
    }

    // 2. Detect SKILL.md files and upsert skills
    const importedSkills = [];
    for (const file of files) {
      if (!file.path.endsWith("/SKILL.md") && file.path !== "SKILL.md")
        continue;

      const content =
        file.encoding === "base64"
          ? Buffer.from(file.content, "base64").toString("utf8")
          : file.content;
      const parsed = matter(content);
      const name =
        parsed.data.name ||
        file.path.replace(/\/SKILL\.md$/, "").split("/").pop() ||
        "Untitled Skill";
      const description = parsed.data.description || "";
      const version = parsed.data.version || "1.0.0";
      const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];

      const s3Key = targetPrefix.endsWith("/")
        ? `${targetPrefix}${file.path}`
        : `${targetPrefix}/${file.path}`;
      const s3Location = `s3://mastra-brain-agent-skills/${s3Key}`;

      const existing = await db
        .select()
        .from(skills)
        .where(eq(skills.s3Location, s3Location));

      if (existing.length > 0) {
        const [updated] = await db
          .update(skills)
          .set({
            name,
            description,
            version,
            tags,
            updatedAt: new Date(),
          })
          .where(eq(skills.id, existing[0].id))
          .returning();
        importedSkills.push(updated);
      } else {
        const [created] = await db
          .insert(skills)
          .values({ name, description, version, tags, s3Location })
          .returning();
        importedSkills.push(created);
      }
    }

    return NextResponse.json({ uploaded, skills: importedSkills });
  } catch (error) {
    console.error("Failed to import skills:", error);
    return NextResponse.json(
      { error: "Failed to import skills" },
      { status: 500 },
    );
  }
}
