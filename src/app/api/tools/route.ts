import { NextResponse } from "next/server";
import { normaliseToolsResponse, type MastraToolsResponse } from "@/types/tool";

const MASTRA_SERVER_URL =
  process.env.NEXT_PUBLIC_MASTRA_SERVER_URL || "http://localhost:4111";

export async function GET() {
  try {
    // Try the custom /tools route first (returns a flat array)
    let response = await fetch(`${MASTRA_SERVER_URL}/tools`);

    // Fall back to the standard /api/tools endpoint (returns an object)
    if (!response.ok) {
      response = await fetch(`${MASTRA_SERVER_URL}/api/tools`);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tools from Mastra server: ${response.statusText}`,
      );
    }

    const data: MastraToolsResponse = await response.json();
    const tools = normaliseToolsResponse(data);

    console.log(
      "Tools fetched from Mastra:",
      Array.isArray(data)
        ? `Array(${data.length})`
        : `Object(${Object.keys(data).length} keys)`,
      `→ normalised to ${tools.length} tools`,
    );

    return NextResponse.json(tools);
  } catch (error) {
    console.error("Error fetching tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 },
    );
  }
}
