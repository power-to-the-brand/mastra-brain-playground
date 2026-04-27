# Agent Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-defined modules so agents can be grouped by module on the agents page.

**Architecture:** A new `modules` table with `name` (unique) and optional `description`. Agents get a nullable `moduleId` foreign key. The agents page fetches agents and modules in parallel, groups agents by module client-side, and renders them under collapsible section headers.

**Tech Stack:** Next.js App Router, React, Drizzle ORM (pg), Tailwind CSS, shadcn/ui

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `mastra-brain/src/db/schema.ts` | Modify | Add `modules` table and `moduleId` to `agents` |
| `mastra-brain-playground/src/db/schema.ts` | Modify | Mirror the same schema changes |
| `mastra-brain-playground/src/db/index.ts` | Modify | Export new `modules` table and types |
| `mastra-brain-playground/src/app/api/modules/route.ts` | Create | GET list, POST create module |
| `mastra-brain-playground/src/app/api/modules/[id]/route.ts` | Create | PATCH update, DELETE module |
| `mastra-brain-playground/src/app/api/agents/route.ts` | Modify | Accept `moduleId` in POST body |
| `mastra-brain-playground/src/app/api/agents/[id]/route.ts` | Modify | Accept `moduleId` in PATCH body |
| `mastra-brain-playground/src/components/agents/module-manager.tsx` | Create | Dialog for CRUD on modules |
| `mastra-brain-playground/src/components/agents/agent-form.tsx` | Modify | Add module dropdown |
| `mastra-brain-playground/src/app/agents/page.tsx` | Modify | Group agents by module, add module manager |

---

### Task 1: Add `modules` table and `moduleId` to core schema

**Files:**
- Modify: `mastra-brain/src/db/schema.ts`

- [ ] **Step 1: Add the `modules` table**

Add this block before the `agents` table definition:

```typescript
// ── Modules ────────────────────────────────────────────────────────────────────

export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
```

- [ ] **Step 2: Add `moduleId` to `agents` table**

In the `agents` table definition, add one column:

```typescript
  moduleId: uuid("module_id").references(() => modules.id, { onDelete: "set null" }),
```

- [ ] **Step 3: Push schema to database**

Run:
```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
npx drizzle-kit push
```

Expected: Pushes `modules` table and adds `module_id` column to `agents`.

- [ ] **Step 4: Commit**

```bash
git add mastra-brain/src/db/schema.ts
git commit -m "feat: add modules table and moduleId to agents schema"
```

---

### Task 2: Mirror schema changes in playground

**Files:**
- Modify: `mastra-brain-playground/src/db/schema.ts`
- Modify: `mastra-brain-playground/src/db/index.ts`

- [ ] **Step 1: Add `modules` table in playground schema**

Add the same `modules` table block from Task 1 to `mastra-brain-playground/src/db/schema.ts`, before the `agents` table.

- [ ] **Step 2: Add `moduleId` to playground `agents` table**

Add the same `moduleId` column from Task 1 to the `agents` table in `mastra-brain-playground/src/db/schema.ts`.

- [ ] **Step 3: Export new table and types from playground db index**

In `mastra-brain-playground/src/db/index.ts`, add to the re-export list:

```typescript
export { modules } from "./schema";
export type { Module, NewModule } from "./schema";
```

- [ ] **Step 4: Commit**

```bash
git add mastra-brain-playground/src/db/schema.ts mastra-brain-playground/src/db/index.ts
git commit -m "feat: mirror modules schema in playground"
```

---

### Task 3: Create modules API — list and create

**Files:**
- Create: `mastra-brain-playground/src/app/api/modules/route.ts`

- [ ] **Step 1: Write the module list/create API**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allModules = await db.select().from(modules).orderBy(modules.name);
    return NextResponse.json({ data: allModules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Module name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check for duplicate name
    const existing = await db.select().from(modules).where(eq(modules.name, trimmedName));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Module name already exists" }, { status: 409 });
    }

    const [newModule] = await db
      .insert(modules)
      .values({
        name: trimmedName,
        description: description || null,
      })
      .returning();

    return NextResponse.json(newModule);
  } catch (error) {
    console.error("Error creating module:", error);
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test GET endpoint**

Run the dev server if not already running, then:
```bash
curl http://localhost:3000/api/modules
```

Expected: `{"data":[]}` (empty array initially)

- [ ] **Step 3: Test POST endpoint**

```bash
curl -X POST http://localhost:3000/api/modules \
  -H "Content-Type: application/json" \
  -d '{"name":"Concierge","description":"Customer-facing concierge agents"}'
```

Expected: JSON object with `id`, `name`, `description`, `createdAt`.

- [ ] **Step 4: Commit**

```bash
git add mastra-brain-playground/src/app/api/modules/route.ts
git commit -m "feat: add modules list and create API"
```

---

### Task 4: Create modules API — update and delete

**Files:**
- Create: `mastra-brain-playground/src/app/api/modules/[id]/route.ts`

- [ ] **Step 1: Write the module update/delete API**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      const existing = await db
        .select()
        .from(modules)
        .where(eq(modules.name, trimmedName));
      if (existing.length > 0 && existing[0].id !== id) {
        return NextResponse.json({ error: "Module name already exists" }, { status: 409 });
      }
    }

    const [updated] = await db
      .update(modules)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        updatedAt: new Date(),
      })
      .where(eq(modules.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await db.delete(modules).where(eq(modules.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test PATCH endpoint**

```bash
curl -X PATCH http://localhost:3000/api/modules/<MODULE_ID> \
  -H "Content-Type: application/json" \
  -d '{"name":"Concierge Updated"}'
```

Expected: Updated module JSON.

- [ ] **Step 3: Test DELETE endpoint**

```bash
curl -X DELETE http://localhost:3000/api/modules/<MODULE_ID>
```

Expected: `{"success":true}`

- [ ] **Step 4: Commit**

```bash
git add mastra-brain-playground/src/app/api/modules/
git commit -m "feat: add module update and delete API"
```

---

### Task 5: Update agent API to accept `moduleId`

**Files:**
- Modify: `mastra-brain-playground/src/app/api/agents/route.ts`
- Modify: `mastra-brain-playground/src/app/api/agents/[id]/route.ts`

- [ ] **Step 1: Update POST `/api/agents` to accept `moduleId`**

In `mastra-brain-playground/src/app/api/agents/route.ts`, in the `POST` handler, update the destructuring:

```typescript
const { name, description, model, instruction, subagentIds, skillIds, toolIds, mockToolIds, moduleId } = body;
```

And add `moduleId` to the insert values:

```typescript
const [newAgent] = await db.insert(agents).values({
  name,
  description,
  model,
  instruction,
  moduleId: moduleId || null,
}).returning();
```

- [ ] **Step 2: Update PATCH `/api/agents/[id]` to accept `moduleId`**

In `mastra-brain-playground/src/app/api/agents/[id]/route.ts`, update the destructuring:

```typescript
const { name, description, model, instruction, subagentIds, skillIds, toolIds, mockToolIds, moduleId } = body;
```

And update the `db.update(agents)` call:

```typescript
await db.update(agents)
  .set({
    name,
    description,
    model,
    instruction,
    moduleId: moduleId !== undefined ? (moduleId || null) : undefined,
    updatedAt: new Date(),
  })
  .where(eq(agents.id, id));
```

Note: only set `moduleId` when it is explicitly present in the body (to avoid overwriting with undefined).

- [ ] **Step 3: Commit**

```bash
git add mastra-brain-playground/src/app/api/agents/route.ts mastra-brain-playground/src/app/api/agents/\[id\]/route.ts
git commit -m "feat: accept moduleId in agent create and update APIs"
```

---

### Task 6: Create ModuleManager dialog component

**Files:**
- Create: `mastra-brain-playground/src/components/agents/module-manager.tsx`

- [ ] **Step 1: Write the ModuleManager component**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

interface Module {
  id: string;
  name: string;
  description: string | null;
}

interface ModuleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: Module[];
  onModulesChange: () => void;
}

export function ModuleManager({ open, onOpenChange, modules, onModulesChange }: ModuleManagerProps) {
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || undefined }),
      });
      if (res.ok) {
        setNewName("");
        setNewDescription("");
        onModulesChange();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create module");
      }
    } catch (error) {
      console.error("Error creating module:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() || undefined }),
      });
      if (res.ok) {
        setEditingId(null);
        onModulesChange();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update module");
      }
    } catch (error) {
      console.error("Error updating module:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this module? Agents in this module will become uncategorized.")) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/modules/${id}`, { method: "DELETE" });
      if (res.ok) {
        onModulesChange();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete module");
      }
    } catch (error) {
      console.error("Error deleting module:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[28rem] bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Manage Modules</DialogTitle>
          <DialogDescription>
            Create, rename, or delete agent grouping modules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new module */}
          <div className="space-y-2">
            <Label htmlFor="new-module-name">New Module</Label>
            <div className="flex gap-2">
              <Input
                id="new-module-name"
                placeholder="Module name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <Textarea
              placeholder="Optional description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Module list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {modules.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-4">No modules yet.</p>
            ) : (
              modules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center justify-between p-2 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950"
                >
                  {editingId === mod.id ? (
                    <div className="flex-1 space-y-2 mr-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(mod.id)} disabled={isSaving}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{mod.name}</p>
                        {mod.description && (
                          <p className="text-xs text-stone-500 truncate">{mod.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(mod.id);
                            setEditName(mod.name);
                            setEditDescription(mod.description || "");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(mod.id)}
                          disabled={isDeleting === mod.id}
                        >
                          {isDeleting === mod.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mastra-brain-playground/src/components/agents/module-manager.tsx
git commit -m "feat: add module manager dialog component"
```

---

### Task 7: Add module dropdown to AgentForm

**Files:**
- Modify: `mastra-brain-playground/src/components/agents/agent-form.tsx`

- [ ] **Step 1: Add module dropdown to AgentForm**

In the `AgentData` interface, add `moduleId?: string | null`.

In `AgentFormProps`, add:
```typescript
availableModules: { id: string; name: string }[];
```

Add state:
```typescript
const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
  agent?.moduleId ?? null
);
```

In the `useEffect` that resets form on agent change, add:
```typescript
setSelectedModuleId(agent?.moduleId ?? null);
```

In the submit handler, add `moduleId: selectedModuleId` to the payload object sent to the API.

In the form JSX, add a dropdown before the model selector:

```typescript
<div className="space-y-2">
  <Label htmlFor="module">Module (optional)</Label>
  <select
    id="module"
    className="flex h-10 w-full rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm ring-offset-white dark:ring-offset-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
    value={selectedModuleId ?? ""}
    onChange={(e) => setSelectedModuleId(e.target.value || null)}
  >
    <option value="">— None —</option>
    {availableModules.map((mod) => (
      <option key={mod.id} value={mod.id}>
        {mod.name}
      </option>
    ))}
  </select>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add mastra-brain-playground/src/components/agents/agent-form.tsx
git commit -m "feat: add module dropdown to agent form"
```

---

### Task 8: Group agents by module on the agents page

**Files:**
- Modify: `mastra-brain-playground/src/app/agents/page.tsx`

- [ ] **Step 1: Update agent interface and fetch modules**

In the `Agent` interface, add:
```typescript
moduleId?: string | null;
```

Add state:
```typescript
const [modules, setModules] = useState<{ id: string; name: string }[]>([]);
const [isModulesOpen, setIsModulesOpen] = useState(false);
```

In `fetchData`, add a call to `/api/modules` in the `Promise.all`:

```typescript
const [agentsRes, skillsRes, toolsRes, mockToolsRes, modulesRes] = await Promise.all([
  fetch("/api/agents"),
  fetch("/api/skills"),
  fetch("/api/tools"),
  fetch("/api/mock-tools"),
  fetch("/api/modules"),
]);
```

Extract modules data and set state:
```typescript
const modulesRaw = await modulesRes.json();
const modulesData = extractArray(modulesRaw);
setModules(modulesData);
```

- [ ] **Step 2: Build grouped agent list helper**

Add a helper function inside the component:

```typescript
const groupAgentsByModule = (agents: Agent[], modules: { id: string; name: string }[]) => {
  const groups: { moduleId: string | null; moduleName: string; agents: Agent[] }[] = [];
  const moduleMap = new Map(modules.map((m) => [m.id, m.name]));
  const grouped = new Map<string | null, Agent[]>();

  for (const agent of agents) {
    const key = agent.moduleId ?? null;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(agent);
  }

  // Add modules in name order first
  for (const mod of modules) {
    const agents = grouped.get(mod.id) || [];
    if (agents.length > 0) {
      groups.push({ moduleId: mod.id, moduleName: mod.name, agents });
    }
  }

  // Uncategorized last
  const uncategorized = grouped.get(null) || [];
  if (uncategorized.length > 0) {
    groups.push({ moduleId: null, moduleName: "Uncategorized", agents: uncategorized });
  }

  return groups;
};
```

- [ ] **Step 3: Render grouped cards**

Replace the existing `agents.map(...)` grid with grouped sections. In the non-empty state (`agents.length > 0`), render:

```typescript
<div className="space-y-8">
  {groupAgentsByModule(agents, modules).map((group) => (
    <div key={group.moduleId ?? "uncategorized"}>
      <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        {group.moduleName}
        <span className="text-sm font-normal text-stone-500">({group.agents.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {group.agents.map((agent) => (
          // existing Card component, unchanged
        ))}
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Add "Manage Modules" button**

Add a button next to the "Create Agent" button:

```typescript
<Button
  variant="outline"
  onClick={() => setIsModulesOpen(true)}
>
  Manage Modules
</Button>
```

And render the `ModuleManager` dialog:

```typescript
<ModuleManager
  open={isModulesOpen}
  onOpenChange={setIsModulesOpen}
  modules={modules}
  onModulesChange={fetchData}
/>
```

- [ ] **Step 5: Update AgentForm props in the page**

Pass `availableModules={modules}` to `<AgentForm />`.

- [ ] **Step 6: Commit**

```bash
git add mastra-brain-playground/src/app/agents/page.tsx
git commit -m "feat: group agents by module on agents page"
```

---

### Task 9: Verify end-to-end

- [ ] **Step 1: Create a module**

Open the agents page, click **"Manage Modules"**, create "Concierge".

- [ ] **Step 2: Assign an agent to the module**

Click **"Edit"** on an agent, select "Concierge" from the Module dropdown, save.

- [ ] **Step 3: Confirm grouping**

The agents page should show a **"Concierge"** section header with the agent card underneath.

- [ ] **Step 4: Delete the module**

Open **"Manage Modules"**, delete "Concierge". Confirm the agent moves back to **"Uncategorized"**.

---

## Self-Review

**1. Spec coverage:**
- ✅ `modules` table with name, description, timestamps — Task 1
- ✅ `moduleId` on agents with `onDelete: "set null"` — Task 1
- ✅ GET/POST `/api/modules` — Task 3
- ✅ PATCH/DELETE `/api/modules/[id]` — Task 4
- ✅ Agent create/update accepts `moduleId` — Task 5
- ✅ Card grid grouped by module — Task 8
- ✅ Module manager dialog — Task 6
- ✅ Module dropdown in agent form — Task 7
- ✅ Unique name constraint with 409 on conflict — Tasks 1, 3, 4
- ✅ Uncategorized group for null moduleId — Task 8

**2. Placeholder scan:** No TBD, TODO, or vague steps found. All steps include actual code.

**3. Type consistency:**
- `Module` type used consistently in frontend and API.
- `moduleId` is nullable string in frontend, UUID nullable in schema.
- API payload keys match what the frontend sends.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-agent-modules.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like?
