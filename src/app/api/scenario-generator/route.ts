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

    if (!mastraData.text || typeof mastraData.text !== "string") {
      return NextResponse.json(
        { error: "Unexpected response from Mastra server: missing text field" },
        { status: 502 },
      );
    }

    // Strip markdown code fences if present (e.g. ```json ... ```)
    let rawText = mastraData.text.trim();
    const codeFenceMatch = rawText.match(
      /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/,
    );
    if (codeFenceMatch) {
      rawText = codeFenceMatch[1].trim();
    }

    const parsed = JSON.parse(rawText);

    // Validate the response structure
    if (
      !parsed.conversationMessages ||
      !Array.isArray(parsed.conversationMessages)
    ) {
      return NextResponse.json(
        {
          error:
            "Unexpected response from Mastra server: missing conversationMessages array",
        },
        { status: 502 },
      );
    }

    if (!parsed.srData || !Array.isArray(parsed.srData)) {
      return NextResponse.json(
        {
          error: "Unexpected response from Mastra server: missing srData array",
        },
        { status: 502 },
      );
    }

    if (
      !parsed.pastSupplierConversation ||
      !Array.isArray(parsed.pastSupplierConversation)
    ) {
      return NextResponse.json(
        {
          error:
            "Unexpected response from Mastra server: missing pastSupplierConversation array",
        },
        { status: 502 },
      );
    }

    if (!parsed.name || typeof parsed.name !== "string") {
      return NextResponse.json(
        {
          error:
            "Unexpected response from Mastra server: missing or invalid name field",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      name: parsed.name,
      conversationMessages: parsed.conversationMessages,
      srData: parsed.srData,
      pastSupplierConversation: parsed.pastSupplierConversation,
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
