import { NextRequest, NextResponse } from "next/server";
import { getFromS3 } from "@/lib/s3";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  if (!key.startsWith("playground/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const content = await getFromS3(key);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("S3 preview error:", error);
    return NextResponse.json({ error: "Failed to fetch file content" }, { status: 500 });
  }
}
