import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents, agentSubagents, agentSkills, agentTools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
      with: {
        subagents: true,
        skills: true,
        tools: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, model, instruction, subagentIds, skillIds, toolIds, mockToolIds, moduleId } = body;

    await db.update(agents)
      .set({
        name,
        description,
        model,
        instruction,
        ...(moduleId !== undefined && { moduleId: moduleId || null }),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, id));

    // Update subagents
    if (subagentIds) {
      await db.delete(agentSubagents).where(eq(agentSubagents.agentId, id));
      if (subagentIds.length > 0) {
        await db.insert(agentSubagents).values(
          subagentIds.map((subagentId: string) => ({
            agentId: id,
            subagentId,
          }))
        );
      }
    }

    // Update skills
    if (skillIds) {
      await db.delete(agentSkills).where(eq(agentSkills.agentId, id));
      if (skillIds.length > 0) {
        await db.insert(agentSkills).values(
          skillIds.map((skillId: string) => ({
            agentId: id,
            skillId,
          }))
        );
      }
    }

    // Update tools (both real and mock)
    if (toolIds !== undefined || mockToolIds !== undefined) {
      await db.delete(agentTools).where(eq(agentTools.agentId, id));

      if (toolIds && toolIds.length > 0) {
        await db.insert(agentTools).values(
          toolIds.map((toolId: string) => ({
            agentId: id,
            toolId,
            toolType: "mastra" as const,
          }))
        );
      }

      if (mockToolIds && mockToolIds.length > 0) {
        await db.insert(agentTools).values(
          mockToolIds.map((toolId: string) => ({
            agentId: id,
            toolId,
            toolType: "mock" as const,
          }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(agents).where(eq(agents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
