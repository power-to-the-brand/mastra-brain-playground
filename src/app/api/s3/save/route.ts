import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, content } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    if (!key.startsWith("playground/")) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "Missing content parameter" }, { status: 400 });
    }

    await uploadToS3(key, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("S3 save error:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
