import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents, agentSubagents, agentSkills, agentTools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allAgents = await db.query.agents.findMany({
      with: {
        subagents: true,
        skills: true,
        tools: true,
      },
    });
    return NextResponse.json({ data: allAgents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, model, instruction, subagentIds, skillIds, toolIds } = body;

    const [newAgent] = await db.insert(agents).values({
      name,
      description,
      model,
      instruction,
    }).returning();

    if (subagentIds && subagentIds.length > 0) {
      await db.insert(agentSubagents).values(
        subagentIds.map((subagentId: string) => ({
          agentId: newAgent.id,
          subagentId,
        }))
      );
    }

    if (skillIds && skillIds.length > 0) {
      await db.insert(agentSkills).values(
        skillIds.map((skillId: string) => ({
          agentId: newAgent.id,
          skillId,
        }))
      );
    }

    if (toolIds && toolIds.length > 0) {
      await db.insert(agentTools).values(
        toolIds.map((toolId: string) => ({
          agentId: newAgent.id,
          toolId,
        }))
      );
    }

    return NextResponse.json(newAgent);
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
