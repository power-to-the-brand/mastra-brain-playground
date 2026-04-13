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
        scenario: body.scenario,
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

    // Validate the response structure
    if (!mastraData.conversationMessages || !Array.isArray(mastraData.conversationMessages)) {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing conversationMessages array" },
        { status: 502 },
      );
    }

    if (!mastraData.srData || !Array.isArray(mastraData.srData)) {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing srData array" },
        { status: 502 },
      );
    }

    if (!mastraData.pastSupplierConversation || !Array.isArray(mastraData.pastSupplierConversation)) {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing pastSupplierConversation array" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      conversationMessages: mastraData.conversationMessages,
      srData: mastraData.srData,
      pastSupplierConversation: mastraData.pastSupplierConversation,
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
