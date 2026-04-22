import { NextRequest, NextResponse } from "next/server";

const MASTRA_SERVER_URL =
  process.env.NEXT_PUBLIC_MASTRA_SERVER_URL ?? "http://localhost:4111";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.input || typeof body.input !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid input field. Expected a string." },
        { status: 400 },
      );
    }

    const mastraUrl = `${MASTRA_SERVER_URL}/api/agents/conversation-transformer-agent/generate`;

    const mastraResponse = await fetch(mastraUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: body.input,
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

    if (!parsed.conversation || !Array.isArray(parsed.conversation)) {
      return NextResponse.json(
        {
          error:
            "Mastra agent output does not contain a valid conversation array",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ conversation: parsed.conversation });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    console.error("Conversation transformer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
