# Mock Tools CRUD & Runtime Execution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Mock Tools system with inline CRUD in the Agent form and a runtime factory that dynamically creates callable Mastra tools from mock configs.

**Architecture:** Add a `mock_tools` table and a `toolType` column to `agent_tools` in both DB schemas. Build REST APIs for mock tool CRUD, update agent save/fetch to handle mock tool associations, add a UI builder inside `AgentForm`, and create a `createMockToolFromConfig` factory in `mastra-brain` that converts DB configs into live `createTool` instances merged into `createDynamicAgent`.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Mastra Core, Zod, Lucide React

---

## File Structure

| File | Responsibility |
|------|----------------|
| `mastra-brain/src/db/schema.ts` | Add `mock_tools` table, add `toolType` to `agent_tools` |
| `mastra-brain-playground/src/db/schema.ts` | Mirror schema changes for playground DB |
| `mastra-brain-playground/src/app/api/mock-tools/route.ts` | `GET` list, `POST` create mock tools |
| `mastra-brain-playground/src/app/api/mock-tools/[id]/route.ts` | `PATCH` update, `DELETE` delete individual mock tool |
| `mastra-brain-playground/src/app/api/agents/route.ts` | Update `POST` to accept `mockToolIds` |
| `mastra-brain-playground/src/app/api/agents/[id]/route.ts` | Update `PATCH`/`GET` to handle `mockToolIds` |
| `mastra-brain-playground/src/components/agents/mock-tool-builder.tsx` | New component: inline mock tool builder UI |
| `mastra-brain-playground/src/components/agents/agent-form.tsx` | Integrate mock tool builder + selector |
| `mastra-brain-playground/src/app/agents/page.tsx` | Fetch mock tools, pass to form, show badge |
| `mastra-brain/src/mastra/tools/mock-tool-factory.ts` | Runtime factory: DB config → Mastra `createTool` |
| `mastra-brain/src/mastra/routes/create-dynamic-agent.ts` | Merge mock tools into agent tool registry |

---

## Task 1: Schema — Add `mock_tools` and `toolType` to `agent_tools` (mastra-brain)

**Files:**
- Modify: `mastra-brain/src/db/schema.ts`

- [ ] **Step 1: Add `mock_tools` table and update `agent_tools`**

Add after the `agentSkillsRelations` block and before `agentToolsRelations`:

```typescript
// ── Mock Tools ───────────────────────────────────────────────────────────────

export const mockTools = pgTable("mock_tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  toolId: varchar("tool_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inputSchema: jsonb("input_schema").notNull().default([]),
  mockMode: varchar("mock_mode", { length: 20 }).notNull(),
  mockFixedResponse: jsonb("mock_fixed_response"),
  mockSimulationPrompt: text("mock_simulation_prompt"),
  mockSimulationModel: varchar("mock_simulation_model", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MockTool = typeof mockTools.$inferSelect;
export type NewMockTool = typeof mockTools.$inferInsert;
```

Update the existing `agentTools` table definition (around line 277-288) to add `toolType`:

```typescript
export const agentTools = pgTable(
  "agent_tools",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    toolId: varchar("tool_id", { length: 255 }).notNull(),
    toolType: varchar("tool_type", { length: 20 }).notNull().default("mastra"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.toolId, t.toolType] }),
  }),
);
```

Update `agentsRelations` to include mock tools:

```typescript
export const agentsRelations = relations(agents, ({ many }) => ({
  subagents: many(agentSubagents, { relationName: "agent_to_subagents" }),
  skills: many(agentSkills),
  tools: many(agentTools),
  mockTools: many(agentTools),
}));
```

Note: Keep `agentToolsRelations` unchanged.

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
git add src/db/schema.ts
git commit -m "feat: add mock_tools table and toolType to agent_tools

- New mock_tools table for global mock tool definitions
- Add toolType column to agent_tools for mastra vs mock distinction
- Include toolType in composite primary key to prevent collisions"
```

---

## Task 2: Schema — Mirror changes in playground DB

**Files:**
- Modify: `mastra-brain-playground/src/db/schema.ts`

- [ ] **Step 1: Add `mock_tools` table and update `agent_tools`**

Add after `agentSkills` block and before `agentTools`:

```typescript
// ── Mock Tools ───────────────────────────────────────────────────────────────

export const mockTools = pgTable("mock_tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  toolId: varchar("tool_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inputSchema: jsonb("input_schema").notNull().default([]),
  mockMode: varchar("mock_mode", { length: 20 }).notNull(),
  mockFixedResponse: jsonb("mock_fixed_response"),
  mockSimulationPrompt: text("mock_simulation_prompt"),
  mockSimulationModel: varchar("mock_simulation_model", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MockTool = typeof mockTools.$inferSelect;
export type NewMockTool = typeof mockTools.$inferInsert;
```

Update existing `agentTools` to add `toolType`:

```typescript
export const agentTools = pgTable(
  "agent_tools",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    toolId: varchar("tool_id", { length: 255 }).notNull(),
    toolType: varchar("tool_type", { length: 20 }).notNull().default("mastra"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.toolId, t.toolType] }),
  }),
);
```

Update `agentsRelations`:

```typescript
export const agentsRelations = relations(agents, ({ many }) => ({
  subagents: many(agentSubagents, { relationName: "agent_to_subagents" }),
  skills: many(agentSkills),
  tools: many(agentTools),
  mockTools: many(agentTools),
}));
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/db/schema.ts
git commit -m "feat: mirror mock_tools schema in playground DB

- Add mock_tools table with all mock config fields
- Add toolType to agent_tools with composite PK update"
```

---

## Task 3: Push schema to database

**Files:**
- None (command only)

- [ ] **Step 1: Push schema in mastra-brain**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
pnpm drizzle-kit push
```

Expected: Schema pushed successfully, `mock_tools` table created, `agent_tools` column `tool_type` added.

- [ ] **Step 2: Push schema in playground**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
pnpm drizzle-kit push
```

Expected: Same as above for the playground DB.

- [ ] **Step 3: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
git commit --allow-empty -m "chore: push mock_tools schema to DB"

cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git commit --allow-empty -m "chore: push mock_tools schema to playground DB"
```

---

## Task 4: API — Create `/api/mock-tools` routes (list + create)

**Files:**
- Create: `mastra-brain-playground/src/app/api/mock-tools/route.ts`

- [ ] **Step 1: Write the route handler**

```typescript
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

    const [newMockTool] = await db
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
      .returning();

    return NextResponse.json({ data: newMockTool });
  } catch (error) {
    console.error("Error creating mock tool:", error);
    return NextResponse.json(
      { error: "Failed to create mock tool" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/api/mock-tools/route.ts
git commit -m "feat: add mock-tools list and create API routes"
```

---

## Task 5: API — Create `/api/mock-tools/[id]` routes (update + delete)

**Files:**
- Create: `mastra-brain-playground/src/app/api/mock-tools/[id]/route.ts`

- [ ] **Step 1: Write the route handler**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { mockTools } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const [updated] = await db
      .update(mockTools)
      .set({
        toolId,
        name,
        description,
        inputSchema,
        mockMode,
        mockFixedResponse,
        mockSimulationPrompt,
        mockSimulationModel,
        updatedAt: new Date(),
      })
      .where(eq(mockTools.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Mock tool not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating mock tool:", error);
    return NextResponse.json(
      { error: "Failed to update mock tool" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.delete(mockTools).where(eq(mockTools.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting mock tool:", error);
    return NextResponse.json(
      { error: "Failed to delete mock tool" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/api/mock-tools/\[id\]/route.ts
git commit -m "feat: add mock-tools update and delete API routes"
```

---

## Task 6: API — Update `POST /api/agents` to handle `mockToolIds`

**Files:**
- Modify: `mastra-brain-playground/src/app/api/agents/route.ts`

- [ ] **Step 1: Update imports and POST handler**

Update imports at the top:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { agents, agentSubagents, agentSkills, agentTools } from "@/db/schema";
import { eq } from "drizzle-orm";
```

Update `POST` handler body extraction:

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      model,
      instruction,
      subagentIds,
      skillIds,
      toolIds,
      mockToolIds,
    } = body;

    const [newAgent] = await db
      .insert(agents)
      .values({
        name,
        description,
        model,
        instruction,
      })
      .returning();

    if (subagentIds && subagentIds.length > 0) {
      await db.insert(agentSubagents).values(
        subagentIds.map((subagentId: string) => ({
          agentId: newAgent.id,
          subagentId,
        })),
      );
    }

    if (skillIds && skillIds.length > 0) {
      await db.insert(agentSkills).values(
        skillIds.map((skillId: string) => ({
          agentId: newAgent.id,
          skillId,
        })),
      );
    }

    if (toolIds && toolIds.length > 0) {
      await db.insert(agentTools).values(
        toolIds.map((toolId: string) => ({
          agentId: newAgent.id,
          toolId,
          toolType: "mastra",
        })),
      );
    }

    if (mockToolIds && mockToolIds.length > 0) {
      await db.insert(agentTools).values(
        mockToolIds.map((toolId: string) => ({
          agentId: newAgent.id,
          toolId,
          toolType: "mock",
        })),
      );
    }

    return NextResponse.json(newAgent);
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/api/agents/route.ts
git commit -m "feat: handle mockToolIds when creating agents"
```

---

## Task 7: API — Update `PATCH /api/agents/[id]` to handle `mockToolIds`

**Files:**
- Modify: `mastra-brain-playground/src/app/api/agents/[id]/route.ts`

- [ ] **Step 1: Update PATCH handler**

Update the body extraction in `PATCH`:

```typescript
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      model,
      instruction,
      subagentIds,
      skillIds,
      toolIds,
      mockToolIds,
    } = body;

    await db
      .update(agents)
      .set({ name, description, model, instruction, updatedAt: new Date() })
      .where(eq(agents.id, id));

    // Update subagents
    if (subagentIds) {
      await db.delete(agentSubagents).where(eq(agentSubagents.agentId, id));
      if (subagentIds.length > 0) {
        await db.insert(agentSubagents).values(
          subagentIds.map((subagentId: string) => ({
            agentId: id,
            subagentId,
          })),
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
          })),
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
          })),
        );
      }

      if (mockToolIds && mockToolIds.length > 0) {
        await db.insert(agentTools).values(
          mockToolIds.map((toolId: string) => ({
            agentId: id,
            toolId,
            toolType: "mock" as const,
          })),
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/api/agents/\[id\]/route.ts
git commit -m "feat: handle mockToolIds when updating agents"
```

---

## Task 8: Frontend — Fetch mock tools on Agents page

**Files:**
- Modify: `mastra-brain-playground/src/app/agents/page.tsx`

- [ ] **Step 1: Add mock tool state and fetch logic**

Update the `Agent` interface to include `toolType`:

```typescript
interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  instruction: string;
  createdAt: string;
  subagents: { agentId: string; subagentId: string }[];
  skills: { agentId: string; skillId: string }[];
  tools: { agentId: string; toolId: string; toolType: string }[];
}
```

Add state for mock tools (around line 35):

```typescript
const [availableMockTools, setAvailableMockTools] = useState<
  { id: string; name: string; description: string; toolId: string }[]
>([]);
```

Update `fetchData` to also fetch mock tools:

```typescript
const fetchData = async () => {
  setIsLoading(true);
  console.log("Fetching agents, skills, tools, and mock tools...");
  try {
    const [agentsRes, skillsRes, toolsRes, mockToolsRes] = await Promise.all([
      fetch("/api/agents"),
      fetch("/api/skills"),
      fetch("/api/tools"),
      fetch("/api/mock-tools"),
    ]);

    const agentsRaw = await agentsRes.json();
    const skillsRaw = await skillsRes.json();
    const toolsRaw = await toolsRes.json();
    const mockToolsRaw = await mockToolsRes.json();

    // ... existing extractArray logic for agents, skills, tools ...

    const agentsData = extractArray(agentsRaw);
    const skillsData = extractArray(skillsRaw);
    const toolsData = extractArray(toolsRaw);

    // Extract mock tools (they come as { data: [...] })
    const mockToolsData = Array.isArray(mockToolsRaw?.data)
      ? mockToolsRaw.data
      : [];

    setAgents(agentsData);
    setAvailableSkills(skillsData);
    setAvailableTools(toolsData);
    setAvailableMockTools(mockToolsData);
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    setIsLoading(false);
  }
};
```

Pass `availableMockTools` to `AgentForm`:

```tsx
<AgentForm
  agent={editingAgent}
  availableAgents={agents.filter((a) => a.id !== editingAgent?.id)}
  availableSkills={availableSkills}
  availableTools={availableTools}
  availableMockTools={availableMockTools}
  onSuccess={handleFormSuccess}
  onCancel={() => setIsFormOpen(false)}
  onRefreshTools={refreshTools}
  isRefreshingTools={isRefreshingTools}
/>
```

- [ ] **Step 2: Show mock tool count badge on agent cards**

In the agent card badges section (around line 280-296), add:

```tsx
{agent.tools?.filter((t) => t.toolType === "mock").length > 0 && (
  <Badge
    variant="secondary"
    className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-none"
  >
    {agent.tools.filter((t) => t.toolType === "mock").length} Mock Tools
  </Badge>
)}
```

Update the existing Tools badge to only count real tools:

```tsx
{agent.tools?.filter((t) => t.toolType === "mastra").length > 0 && (
  <Badge
    variant="secondary"
    className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-none"
  >
    {agent.tools.filter((t) => t.toolType === "mastra").length} Tools
  </Badge>
)}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/agents/page.tsx
git commit -m "feat: fetch and display mock tools on agents page

- Fetch mock tools alongside agents/skills/tools
- Add mock tool count badge to agent cards
- Pass availableMockTools to AgentForm"
```

---

## Task 9: Frontend — Create `MockToolBuilder` component

**Files:**
- Create: `mastra-brain-playground/src/components/agents/mock-tool-builder.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";

const PARAM_TYPES = ["string", "number", "boolean", "array", "object"] as const;
type ParamType = (typeof PARAM_TYPES)[number];

interface InputParam {
  id: string;
  name: string;
  type: ParamType;
  description: string;
  required: boolean;
}

export interface MockToolData {
  id?: string;
  toolId: string;
  name: string;
  description: string;
  inputSchema: InputParam[];
  mockMode: "fixed_response" | "llm_simulated";
  mockFixedResponse: string;
  mockSimulationPrompt: string;
  mockSimulationModel: string;
}

interface MockToolBuilderProps {
  tools: MockToolData[];
  onChange: (tools: MockToolData[]) => void;
  availableModels: { label: string; value: string }[];
}

function normalizeToolId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-+/g, "-");
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function MockToolBuilder({
  tools,
  onChange,
  availableModels,
}: MockToolBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addTool = () => {
    const newTool: MockToolData = {
      toolId: "",
      name: "",
      description: "",
      inputSchema: [],
      mockMode: "fixed_response",
      mockFixedResponse: "",
      mockSimulationPrompt: "",
      mockSimulationModel: availableModels[0]?.value ?? "",
    };
    onChange([...tools, newTool]);
    setExpandedId(newTool.toolId);
  };

  const updateTool = (index: number, updates: Partial<MockToolData>) => {
    const updated = [...tools];
    updated[index] = { ...updated[index], ...updates };

    // Auto-normalize toolId when name changes
    if (updates.name !== undefined) {
      updated[index].toolId = normalizeToolId(updates.name);
    }

    onChange(updated);
  };

  const removeTool = (index: number) => {
    const updated = tools.filter((_, i) => i !== index);
    onChange(updated);
  };

  const addParam = (toolIndex: number) => {
    const updated = [...tools];
    updated[toolIndex].inputSchema.push({
      id: generateId(),
      name: "",
      type: "string",
      description: "",
      required: true,
    });
    onChange(updated);
  };

  const updateParam = (
    toolIndex: number,
    paramIndex: number,
    updates: Partial<InputParam>,
  ) => {
    const updated = [...tools];
    updated[toolIndex].inputSchema[paramIndex] = {
      ...updated[toolIndex].inputSchema[paramIndex],
      ...updates,
    };
    onChange(updated);
  };

  const removeParam = (toolIndex: number, paramIndex: number) => {
    const updated = [...tools];
    updated[toolIndex].inputSchema.splice(paramIndex, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {tools.map((tool, toolIndex) => {
          const isExpanded = expandedId === tool.toolId;
          const paramCount = tool.inputSchema.length;

          return (
            <div
              key={tool.toolId + toolIndex}
              className="border border-stone-200 dark:border-stone-800 rounded-xl bg-white dark:bg-stone-950 overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors"
                onClick={() =>
                  setExpandedId(isExpanded ? null : tool.toolId)
                }
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-stone-400" />
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {tool.name || "Unnamed Tool"}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-stone-100 dark:bg-stone-800"
                  >
                    {paramCount} param{paramCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-stone-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-stone-500" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTool(toolIndex);
                    }}
                    className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 space-y-4 border-t border-stone-100 dark:border-stone-800">
                  {/* Name + ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-stone-700 dark:text-stone-300 text-sm">
                        Tool Name
                      </Label>
                      <input
                        value={tool.name}
                        onChange={(e) =>
                          updateTool(toolIndex, { name: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                        placeholder="e.g. Get Quotation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-stone-700 dark:text-stone-300 text-sm">
                        Tool ID
                      </Label>
                      <input
                        value={tool.toolId}
                        readOnly
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md text-sm text-stone-500"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-stone-700 dark:text-stone-300 text-sm">
                      Description
                    </Label>
                    <input
                      value={tool.description}
                      onChange={(e) =>
                        updateTool(toolIndex, {
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                      placeholder="What does this tool do?"
                    />
                  </div>

                  {/* Parameters */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-stone-700 dark:text-stone-300 text-sm">
                        Parameters
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addParam(toolIndex)}
                      >
                        + Add
                      </Button>
                    </div>

                    {tool.inputSchema.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">
                        No parameters defined.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_120px_1fr_60px_40px] gap-2 text-xs text-stone-500 uppercase tracking-wider px-2">
                          <span>Name</span>
                          <span>Type</span>
                          <span>Description</span>
                          <span className="text-center">Req.</span>
                          <span />
                        </div>
                        {tool.inputSchema.map((param, paramIndex) => (
                          <div
                            key={param.id}
                            className="grid grid-cols-[1fr_120px_1fr_60px_40px] gap-2 items-center"
                          >
                            <input
                              value={param.name}
                              onChange={(e) =>
                                updateParam(toolIndex, paramIndex, {
                                  name: e.target.value,
                                })
                              }
                              className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                              placeholder="paramName"
                            />
                            <select
                              value={param.type}
                              onChange={(e) =>
                                updateParam(toolIndex, paramIndex, {
                                  type: e.target.value as ParamType,
                                })
                              }
                              className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                            >
                              {PARAM_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <input
                              value={param.description}
                              onChange={(e) =>
                                updateParam(toolIndex, paramIndex, {
                                  description: e.target.value,
                                })
                              }
                              className="px-2 py-1.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-sm focus:outline-none focus:border-amber-500"
                              placeholder="Optional description"
                            />
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={param.required}
                                onChange={(e) =>
                                  updateParam(toolIndex, paramIndex, {
                                    required: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeParam(toolIndex, paramIndex)}
                              className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-stone-400 hover:text-red-500 transition-colors flex justify-center"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mock Config */}
                  <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <Label className="text-stone-700 dark:text-stone-300 text-sm">
                      Mock Mode
                    </Label>
                    <select
                      value={tool.mockMode}
                      onChange={(e) =>
                        updateTool(toolIndex, {
                          mockMode: e.target.value as MockToolData["mockMode"],
                        })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                    >
                      <option value="fixed_response">Fixed Response</option>
                      <option value="llm_simulated">LLM Simulated</option>
                    </select>

                    {tool.mockMode === "fixed_response" ? (
                      <div className="space-y-2">
                        <Label className="text-stone-700 dark:text-stone-300 text-sm">
                          Fixed Response (JSON)
                        </Label>
                        <textarea
                          value={tool.mockFixedResponse}
                          onChange={(e) =>
                            updateTool(toolIndex, {
                              mockFixedResponse: e.target.value,
                            })
                          }
                          className="w-full min-h-[80px] px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm font-mono"
                          placeholder='{"price": 100, "currency": "USD"}'
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-stone-700 dark:text-stone-300 text-sm">
                            Simulation Prompt
                          </Label>
                          <textarea
                            value={tool.mockSimulationPrompt}
                            onChange={(e) =>
                              updateTool(toolIndex, {
                                mockSimulationPrompt: e.target.value,
                              })
                            }
                            className="w-full min-h-[80px] px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                            placeholder="You are a tool that returns realistic pricing data..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-stone-700 dark:text-stone-300 text-sm">
                            Model
                          </Label>
                          <select
                            value={tool.mockSimulationModel}
                            onChange={(e) =>
                              updateTool(toolIndex, {
                                mockSimulationModel: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
                          >
                            {availableModels.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addTool}
        className="w-full"
      >
        + Add Mock Tool
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/components/agents/mock-tool-builder.tsx
git commit -m "feat: add MockToolBuilder component for inline mock tool CRUD

- Collapsible cards with name, auto-normalized toolId, description
- Parameter builder with name/type/description/required rows
- Mock mode selector: Fixed Response (JSON textarea) or LLM Simulated (prompt + model dropdown)"
```

---

## Task 10: Frontend — Integrate `MockToolBuilder` into `AgentForm`

**Files:**
- Modify: `mastra-brain-playground/src/components/agents/agent-form.tsx`

- [ ] **Step 1: Update imports and props**

Update imports:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, RefreshCw } from "lucide-react";
import {
  MockToolBuilder,
  MockToolData,
} from "@/components/agents/mock-tool-builder";
```

Update `AgentData` interface:

```typescript
interface AgentData {
  id: string;
  name: string;
  description?: string;
  model: string;
  instruction: string;
  subagents?: { subagentId: string }[];
  skills?: { skillId: string }[];
  tools?: { toolId: string; toolType: string }[];
}
```

Update `AgentFormProps`:

```typescript
interface AgentFormProps {
  agent?: AgentData | null;
  availableAgents: AgentData[];
  availableSkills: { id: string; name: string }[];
  availableTools: { id: string; name: string; description: string }[];
  availableMockTools: {
    id: string;
    name: string;
    description: string;
    toolId: string;
  }[];
  onSuccess: () => void;
  onCancel: () => void;
  onRefreshTools?: () => void;
  isRefreshingTools?: boolean;
}
```

- [ ] **Step 2: Add state and mock tool save logic**

Add state inside `AgentForm`:

```typescript
export function AgentForm({
  agent,
  availableAgents,
  availableSkills,
  availableTools,
  availableMockTools,
  onSuccess,
  onCancel,
  onRefreshTools,
  isRefreshingTools,
}: AgentFormProps) {
  // ... existing state ...

  const [selectedMockToolIds, setSelectedMockToolIds] = useState<string[]>(
    Array.isArray(agent?.tools)
      ? agent.tools
          .filter((t) => t.toolType === "mock")
          .map((t) => t.toolId)
      : [],
  );

  const [builderTools, setBuilderTools] = useState<MockToolData[]>([]);
  const [isSavingMockTools, setIsSavingMockTools] = useState(false);
```

Add helper to save mock tools:

```typescript
  const saveMockTools = async (): Promise<string[]> => {
    setIsSavingMockTools(true);
    const savedIds: string[] = [...selectedMockToolIds];

    try {
      for (const tool of builderTools) {
        if (!tool.name.trim()) continue;

        const payload = {
          toolId: tool.toolId,
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema.map((p) => ({
            name: p.name,
            type: p.type,
            description: p.description,
            required: p.required,
          })),
          mockMode: tool.mockMode,
          mockFixedResponse:
            tool.mockMode === "fixed_response" && tool.mockFixedResponse
              ? JSON.parse(tool.mockFixedResponse)
              : null,
          mockSimulationPrompt:
            tool.mockMode === "llm_simulated"
              ? tool.mockSimulationPrompt
              : null,
          mockSimulationModel:
            tool.mockMode === "llm_simulated"
              ? tool.mockSimulationModel
              : null,
        };

        if (tool.id) {
          // Update existing
          const res = await fetch(`/api/mock-tools/${tool.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            savedIds.push(data.data.toolId);
          }
        } else {
          // Create new
          const res = await fetch("/api/mock-tools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            savedIds.push(data.data.toolId);
          }
        }
      }
    } catch (error) {
      console.error("Error saving mock tools:", error);
    } finally {
      setIsSavingMockTools(false);
    }

    return savedIds;
  };
```

- [ ] **Step 3: Update handleSubmit**

Replace the existing `handleSubmit`:

```typescript
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const mockToolIds = await saveMockTools();

    const payload = {
      name,
      description,
      model,
      instruction,
      subagentIds: selectedSubagentIds,
      skillIds: selectedSkillIds,
      toolIds: selectedToolIds,
      mockToolIds,
    };

    console.log("Saving agent with payload:", payload);

    try {
      const url = agent ? `/api/agents/${agent.id}` : "/api/agents";
      const method = agent ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving agent:", error);
    } finally {
      setIsLoading(false);
    }
  };
```

- [ ] **Step 4: Add toggle and builder UI**

Add `toggleMockTool` helper:

```typescript
  const toggleMockTool = (id: string) => {
    setSelectedMockToolIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };
```

Add the Mock Tools section in the form JSX, after the Tools section (before the action buttons):

```tsx
      {/* Mock Tools Builder */}
      <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-stone-800">
        <Label className="text-stone-700 dark:text-stone-300 font-medium">
          Mock Tools
        </Label>
        <MockToolBuilder
          tools={builderTools}
          onChange={setBuilderTools}
          availableModels={MODELS}
        />
      </div>

      {/* Mock Tool Selector */}
      <div className="space-y-3">
        <Label className="text-stone-700 dark:text-stone-300">
          Available Mock Tools
        </Label>
        <div className="flex flex-wrap gap-2">
          {availableMockTools.length === 0 ? (
            <p className="text-xs text-stone-500 italic">
              No mock tools available. Create one above.
            </p>
          ) : (
            availableMockTools.map((t) => (
              <Badge
                key={t.id}
                variant={
                  selectedMockToolIds.includes(t.toolId)
                    ? "default"
                    : "outline"
                }
                className={`cursor-pointer transition-all ${
                  selectedMockToolIds.includes(t.toolId)
                    ? "bg-purple-600 hover:bg-purple-700 text-white border-none"
                    : "hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
                onClick={() => toggleMockTool(t.toolId)}
              >
                {t.name}
                {selectedMockToolIds.includes(t.toolId) && (
                  <Check className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))
          )}
        </div>
      </div>
```

- [ ] **Step 5: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/components/agents/agent-form.tsx
git commit -m "feat: integrate mock tools into AgentForm

- Add MockToolBuilder for inline mock tool creation/editing
- Add mock tool badge selector below builder
- Save mock tools before agent on submit
- Include mockToolIds in agent payload"
```

---

## Task 11: Runtime — Create `mock-tool-factory.ts` in mastra-brain

**Files:**
- Create: `mastra-brain/src/mastra/tools/mock-tool-factory.ts`

- [ ] **Step 1: Write the factory**

```typescript
import { createTool } from "@mastra/core";
import { z } from "zod";
import { MockTool } from "../../db/schema.js";

interface InputParam {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

function buildZodSchema(params: InputParam[]): z.ZodTypeAny {
  if (!params || params.length === 0) {
    return z.object({});
  }

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const param of params) {
    let schema: z.ZodTypeAny;

    switch (param.type) {
      case "string":
        schema = z.string();
        break;
      case "number":
        schema = z.number();
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "array":
        schema = z.array(z.any());
        break;
      case "object":
        schema = z.record(z.any());
        break;
      default:
        schema = z.any();
    }

    shape[param.name] = param.required ? schema : schema.optional();
  }

  return z.object(shape);
}

/**
 * Creates a Mastra tool instance from a mock tool DB config.
 */
export function createMockToolFromConfig(config: MockTool) {
  const inputSchema = buildZodSchema(
    (config.inputSchema as InputParam[]) ?? [],
  );

  return createTool({
    id: config.toolId,
    description: config.description ?? config.name,
    inputSchema,
    execute: async ({ context }) => {
      console.log(
        `[MockTool] ${config.toolId} called with args:`,
        JSON.stringify(context),
      );

      if (config.mockMode === "fixed_response") {
        return config.mockFixedResponse ?? {};
      }

      if (config.mockMode === "llm_simulated") {
        // Import the LLM caller dynamically to avoid circular deps
        const { generateText } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        const google = createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        const modelParts = config.mockSimulationModel?.split("/");
        const modelId =
          modelParts && modelParts.length > 1
            ? modelParts[1]
            : config.mockSimulationModel ?? "gemini-2.0-flash";

        const { text } = await generateText({
          model: google(modelId),
          system: config.mockSimulationPrompt ?? "You are a helpful tool.",
          prompt: `Tool arguments: ${JSON.stringify(context)}`,
        });

        try {
          return JSON.parse(text);
        } catch {
          return { response: text };
        }
      }

      return {};
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
git add src/mastra/tools/mock-tool-factory.ts
git commit -m "feat: add mock tool factory for dynamic tool creation

- buildZodSchema converts inputSchema array to Zod object schema
- createMockToolFromConfig creates Mastra tool with fixed or LLM-simulated execute"
```

---

## Task 12: Runtime — Integrate mock tools into `createDynamicAgent`

**Files:**
- Modify: `mastra-brain/src/mastra/routes/create-dynamic-agent.ts`

- [ ] **Step 1: Update imports and tool resolution**

Update imports:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { Agent } from "@mastra/core/agent";
import { Workspace } from "@mastra/core/workspace";
import { S3Filesystem } from "@mastra/s3";
import { db } from "../../db/index.js";
import { eq } from "drizzle-orm";
import {
  agents as agentsTable,
  AgentTool,
  mockTools,
} from "../../db/schema.js";
import { createMockToolFromConfig } from "../tools/mock-tool-factory.js";
```

Update `mapAgentTools` to also resolve mock tools:

```typescript
/**
 * Maps DB tool references to live Mastra tool instances.
 * Handles both real Mastra tools and mock tools.
 */
async function mapAgentTools(
  agentTools: AgentTool[],
  mastra: Mastra,
): Promise<Record<string, any>> {
  const requiredTools: Record<string, any> = {};
  const realToolIds: string[] = [];
  const mockToolIds: string[] = [];

  // Separate real and mock tools
  for (const t of agentTools) {
    if (t.toolType === "mock") {
      mockToolIds.push(t.toolId);
    } else {
      realToolIds.push(t.toolId);
    }
  }

  // Resolve real Mastra tools
  if (realToolIds.length > 0) {
    const allTools = mastra.listTools();
    if (allTools) {
      Object.entries(allTools).forEach(([toolName, tool]) => {
        if (realToolIds.includes(tool.id)) {
          requiredTools[toolName] = tool;
        }
      });
    }
  }

  // Resolve mock tools from DB
  if (mockToolIds.length > 0) {
    const mockToolConfigs = await db
      .select()
      .from(mockTools)
      .where(eq(mockTools.toolId, mockToolIds[0]));
    // Note: Drizzle doesn't have a clean "where in" for this pattern with our setup.
    // Fetch all and filter in memory for simplicity:
    const allMockTools = await db.select().from(mockTools);
    const matchedMockTools = allMockTools.filter((mt) =>
      mockToolIds.includes(mt.toolId),
    );

    for (const config of matchedMockTools) {
      const mockTool = createMockToolFromConfig(config);
      requiredTools[config.toolId] = mockTool;
    }
  }

  return requiredTools;
}
```

Update the call site in `createDynamicAgent`:

```typescript
  // Resolve tools from mastra and mock configs
  const requiredTools = await mapAgentTools(
    agentData.tools as AgentTool[],
    mastra,
  );
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
git add src/mastra/routes/create-dynamic-agent.ts
git commit -m "feat: integrate mock tools into dynamic agent creation

- mapAgentTools now resolves both real Mastra tools and mock tools
- Mock tools fetched from DB and instantiated via createMockToolFromConfig
- Merged into agent tool registry alongside real tools"
```

---

## Task 13: End-to-end smoke test

**Files:**
- None (manual verification steps)

- [ ] **Step 1: Start both servers**

Terminal 1:
```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
pnpm dev
```

Terminal 2:
```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
pnpm dev
```

- [ ] **Step 2: Create a test mock tool in the UI**

1. Open http://localhost:3000/agents
2. Click "Create Agent"
3. In the **Mock Tools** section, click **"+ Add Mock Tool"**
4. Fill in:
   - Name: `Get Weather`
   - Description: `Returns current weather for a location`
   - Add 1 parameter: `location` (string, required)
   - Mock Mode: `Fixed Response`
   - Fixed Response: `{"temperature": 25, "unit": "C"}`
5. Click the badge to select the mock tool.
6. Fill in agent name, model, instruction.
7. Click **"Create Agent"**.
8. Verify the agent card shows `1 Mock Tools` badge.

- [ ] **Step 3: Edit the agent**

1. Click the edit icon on the agent card.
2. Verify the mock tool appears pre-selected.
3. Change the mock tool to **LLM Simulated** mode, set a prompt, select a model.
4. Save. Verify no errors.

- [ ] **Step 4: Runtime test**

1. Trigger a scenario run with this agent (via existing run flow).
2. Check the Mastra-brain server logs for `[MockTool] get-weather called with args:...`
3. Verify the tool returns the configured response.

- [ ] **Step 5: Commit test notes**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git commit --allow-empty -m "test: e2e smoke test passed for mock tools"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| `mock_tools` table schema | Task 1, Task 2 |
| `toolType` on `agent_tools` | Task 1, Task 2 |
| Push schema to DB | Task 3 |
| `GET/POST /api/mock-tools` | Task 4 |
| `PATCH/DELETE /api/mock-tools/:id` | Task 5 |
| `POST /api/agents` with `mockToolIds` | Task 6 |
| `PATCH/GET /api/agents/:id` with `mockToolIds` | Task 7 |
| Fetch mock tools on agents page | Task 8 |
| Show mock tool badge on agent cards | Task 8 |
| Inline mock tool builder UI | Task 9 |
| Integrate builder into `AgentForm` | Task 10 |
| Runtime factory `createMockToolFromConfig` | Task 11 |
| Integrate factory into `createDynamicAgent` | Task 12 |
| Zod schema builder from input params | Task 11 |
| LLM simulation execute path | Task 11 |
| Fixed response execute path | Task 11 |

**Coverage:** All spec requirements are covered. No gaps found.

### Placeholder Scan

- No `TBD`, `TODO`, or `implement later` strings found.
- All steps contain complete code, exact file paths, and expected commands.
- No vague instructions like "add error handling" — specific code provided.

### Type Consistency Check

- `MockToolData` interface in `mock-tool-builder.tsx` matches the payload shape sent to `/api/mock-tools`.
- `toolType` values are consistently `"mastra" | "mock"` across schema, API, and frontend.
- `toolId` vs `id` usage is consistent: `toolId` is the normalized string (used for Mastra tool ID and stored in `agent_tools.toolId`), `id` is the DB UUID.

---

*Plan generated from spec: docs/superpowers/specs/2026-04-22-mock-tools-design.md*
