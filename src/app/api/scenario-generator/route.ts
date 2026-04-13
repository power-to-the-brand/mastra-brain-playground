import { NextRequest, NextResponse } from "next/server";

const MASTRA_SERVER_URL =
  process.env.MASTRA_SERVER_URL ?? "http://localhost:4111";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.scenario || typeof body.scenario !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid scenario field. Expected a string." },
        { status: 400 },
      );
    }

    const mastraUrl = `${MASTRA_SERVER_URL}/api/agents/scenario-generator-agent/generate`;

    const mastraResponse = await fetch(mastraUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: body.scenario,
          },
        ],
      }),
    });

    if (!mastraResponse.ok) {
      const errorText = await mastraResponse.text().catch(() => "");
      console.error(
        `Mastra server responded with status ${mastraResponse.status}: ${errorText}`,
      );
      return NextResponse.json(
        {
          error: `Mastra server returned status ${mastraResponse.status}`,
          details: errorText || undefined,
        },
        { status: 502 },
      );
    }

    const mastraData = await mastraResponse.json();

    // Parse the output - Mastra returns { text: string } with the JSON inside
    let output;
    try {
      // Try to parse as JSON directly first
      output = typeof mastraData === "string" ? JSON.parse(mastraData) : mastraData;
    } catch {
      // If mastraData has a text field, try parsing that
      const textContent = mastraData.text || mastraData.output || mastraData;
      output = typeof textContent === "string" ? JSON.parse(textContent) : textContent;
    }

    // Validate the response structure
    if (!output.conversationMessages || !Array.isArray(output.conversationMessages)) {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing conversationMessages array" },
        { status: 502 },
      );
    }

    if (!output.srData || !Array.isArray(output.srData)) {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing srData array" },
        { status: 502 },
      );
    }

    if (!output.pastSupplierConversation || !Array.isArray(output.pastSupplierConversation)) {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing pastSupplierConversation array" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      conversationMessages: output.conversationMessages,
      srData: output.srData,
      pastSupplierConversation: output.pastSupplierConversation,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    console.error("Scenario generator error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
