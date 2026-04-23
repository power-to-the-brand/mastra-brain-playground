import { NextResponse } from "next/server";
import { db } from "@/db";
import { mockTools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allMockTools = await db.query.mockTools.findMany({
      orderBy: (mockTools, { desc }) => [desc(mockTools.createdAt)],
    });
    return NextResponse.json({ data: allMockTools });
  } catch (error) {
    console.error("Error fetching mock tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch mock tools" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      toolId,
      name,
      description,
      inputSchema,
      mockMode,
      mockFixedResponse,
      mockSimulationPrompt,
      mockSimulationModel,
    } = body;

    const result = await db
      .insert(mockTools)
      .values({
        toolId,
        name,
        description,
        inputSchema: inputSchema ?? [],
        mockMode,
        mockFixedResponse,
        mockSimulationPrompt,
        mockSimulationModel,
      })
      .onConflictDoUpdate({
        target: mockTools.toolId,
        set: {
          name,
          description,
          inputSchema: inputSchema ?? [],
          mockMode,
          mockFixedResponse,
          mockSimulationPrompt,
          mockSimulationModel,
          updatedAt: new Date(),
        },
      })
      .returning();

    const newMockTool = result[0];

    return NextResponse.json({ data: newMockTool });
  } catch (error) {
    console.error("Error creating mock tool:", error);
    return NextResponse.json(
      { error: "Failed to create mock tool" },
      { status: 500 },
    );
  }
}
