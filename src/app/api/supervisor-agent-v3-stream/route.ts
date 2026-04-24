import { NextRequest, NextResponse } from "next/server";
import {
  normalizeSupplierConversations,
  flattenSupplierConversations,
} from "@/lib/supplier-conversations";

const MASTRA_SERVER_URL =
  process.env.NEXT_PUBLIC_MASTRA_SERVER_URL ?? "http://localhost:4111";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      conversationMessages,
      quotationData,
      pastSupplierConversation,
    } = body;

    // Validate required fields
    if (!conversationMessages || !Array.isArray(conversationMessages)) {
      return NextResponse.json(
        { error: "Missing or invalid conversationMessages. Expected an array." },
        { status: 400 },
      );
    }

    if (!quotationData || typeof quotationData !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid quotationData. Expected an object." },
        { status: 400 },
      );
    }

    // Extract SR ID from quotation data if available
    const srId =
      quotationData.runId ||
      quotationData.srId ||
      "SR-PLAYGROUND-001";

    // Format conversation messages as line-by-line for the agent
    const formatConversation = (messages: Array<{ role: string; content: string }>) => {
      return messages
        .map((msg) => `[${msg.role === "user" ? "Customer" : "Bot"}]: ${msg.content}`)
        .join("\n");
    };

    const customerConversationText = formatConversation(conversationMessages);
    const normalizedSuppliers = normalizeSupplierConversations(pastSupplierConversation);
    const flattened = flattenSupplierConversations(normalizedSuppliers);
    const supplierConversationText = flattened.length > 0
      ? formatConversation(flattened)
      : "No past supplier conversation available."

    // Build the prompt with all required context
    const prompt = `
SR ID: ${srId}

== PAST SUPPLIER CONVERSATION ==
${supplierConversationText}

== CUSTOMER CONVERSATION ==
${customerConversationText}

== QUOTATION DATA ==
${JSON.stringify(quotationData, null, 2)}

Please analyze this context and determine the appropriate actions to take.
Follow the supervisor-agent-v3 workflow:
1. Summarize the conversation to understand what has happened and the current ask
2. Determine the right actions based on the customer's current request
3. Create tickets for each action with appropriate assignees

Return your analysis and recommended actions in JSON format.
`;

    // Call the Mastra server's streaming supervisor-v3 route
    const mastraUrl = `${MASTRA_SERVER_URL}/supervisor-v3`;

    const mastraResponse = await fetch(mastraUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
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

    // Stream the response directly to the client
    // Extract the readable stream from the mastra response
    const mastraStream = mastraResponse.body;

    if (!mastraStream) {
      return NextResponse.json(
        { error: "No stream available from Mastra server" },
        { status: 500 },
      );
    }

    // Pipe the mastra stream directly to the response
    // The Mastra server already sends SSE format, we just pass it through
    return new Response(mastraStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    console.error("Supervisor agent v3 error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}