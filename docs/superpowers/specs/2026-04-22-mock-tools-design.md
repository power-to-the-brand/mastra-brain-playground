# Mock Tools CRUD & Runtime Execution — Design Spec

**Date:** 2026-04-22
**Status:** Approved
**Scope:** Add a global Mock Tools system to the Mastra Brain Playground, with inline CRUD inside the Agent form and a runtime factory for dynamic tool creation.

---

## 1. Problem Statement

Currently, agents in the playground can only use real Mastra tools registered in the `mastra-brain` server. There is no way to define "mock" or "simulated" tools for testing scenarios — tools that return either a fixed JSON response or an LLM-generated response based on a prompt. Users need the ability to:

1. Define tool metadata (name, ID, description, input parameters).
2. Configure how the tool responds at runtime (fixed vs. LLM-simulated).
3. Attach mock tools to agents alongside real Mastra tools.
4. Have those mock tools dynamically instantiated and callable during agent runs.

---

## 2. Goals & Non-Goals

### Goals
- Global `mock_tools` table with inline CRUD inside the Agent form.
- UI parameter builder (name, type, description, required) that maps to a Zod schema at runtime.
- Two mock modes: `fixed_response` (returns static JSON) and `llm_simulated` (calls an LLM with a prompt + tool arguments).
- Distinguish mock tools from real Mastra tools in the `agent_tools` join table.
- Runtime factory function in `mastra-brain` that dynamically creates `createTool` instances from mock configs.

### Non-Goals (out of scope for this version)
- Standalone Mock Tools management page (will be added later).
- Error Rate / probabilistic failure simulation.
- Advanced input schema types (nested objects, discriminated unions, etc.).
- Versioning or history for mock tool configs.

---

## 3. Data Model

### 3.1 New Table: `mock_tools`

Stored in both `mastra-brain/src/db/schema.ts` and `mastra-brain-playground/src/db/schema.ts` (they are independent schemas).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` | PK, default random | Internal DB ID |
| `toolId` | `varchar(255)` | NOT NULL, UNIQUE | Normalized kebab-case ID, e.g. `get-quotation` |
| `name` | `varchar(255)` | NOT NULL | Human-readable name, e.g. `Get Quotation` |
| `description` | `text` | nullable | Tool description shown in UI and LLM context |
| `inputSchema` | `jsonb` | NOT NULL, default `[]` | Array of `{ name, type, description, required }`. `[]` means no params. |
| `mockMode` | `varchar(20)` | NOT NULL | `fixed_response` or `llm_simulated` |
| `mockFixedResponse` | `jsonb` | nullable | Static JSON payload returned when mode is fixed |
| `mockSimulationPrompt` | `text` | nullable | System prompt used when mode is LLM-simulated |
| `mockSimulationModel` | `varchar(255)` | nullable | Model ID, e.g. `google/gemini-2.0-flash` |
| `createdAt` | `timestamp` | default now | |
| `updatedAt` | `timestamp` | default now | |

### 3.2 Updated Table: `agent_tools`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `agentId` | `uuid` | FK → agents.id, part of PK | |
| `toolId` | `varchar(255)` | part of PK | Mastra tool key (string) OR mock_tools.id (UUID string) |
| `toolType` | `varchar(20)` | NOT NULL, default `mastra`, part of PK | Enum: `mastra` \| `mock` |

**Rationale:** `agent_tools` already stores Mastra tool keys as plain `varchar` because Mastra tools live in the external server, not our DB. Adding `toolType` lets us distinguish whether a given row refers to a real Mastra tool or a mock tool, without changing the existing storage pattern for real tools.

### 3.3 Drizzle Relations

- `mock_tools` has no direct Drizzle relation to `agents`. The relationship is many-to-many via `agent_tools` with `toolType = 'mock'`.
- `agent_tools` relation to `agents` remains unchanged.
- No FK from `agent_tools` to `mock_tools` because `toolId` can be either a Mastra key or a mock tool UUID.

---

## 4. UI / UX Design

### 4.1 Agent Form (`AgentForm`)

A new **"Mock Tools"** section is added below the existing **"Tools"** section. It contains two sub-sections:

#### A. Mock Tool Builder (Inline CRUD)

- **"+ Add Mock Tool"** button creates a new empty collapsible card.
- **Each card** contains:
  - **Tool Name** input. As the user types, a `toolId` preview (e.g. `get-quotation`) is shown in real-time. Normalization: lowercase, trim, replace spaces/special chars with hyphens, collapse multiple hyphens.
  - **Description** input.
  - **Parameters** table:
    - Columns: `Name`, `Type`, `Description`, `Required`, `Delete`.
    - `Type` dropdown: `string`, `number`, `boolean`, `array`, `object`.
    - **"+ Add"** button to append a new parameter row.
    - Each row has a delete button (trash icon).
  - **Mock Config**:
    - **Mock Mode** dropdown: `Fixed Response` | `LLM Simulated`.
    - If `Fixed Response`: JSON text area for `mockFixedResponse`.
    - If `LLM Simulated`:
      - `Simulation Prompt` textarea.
      - `Model` dropdown (reuse the same `MODELS` array used for agent model selection).
  - **Card-level delete button** to remove the tool from the DB.

#### B. Mock Tool Selector

Below the builder, a **badge toggle list** (same pattern as Skills and Tools) shows all saved mock tools. Each badge displays the tool name. Clicking toggles whether the tool is attached to the current agent.

### 4.2 Agent Card Badges

On the Agents list page (`/agents`), the agent cards currently show:
- `{N} Skills`
- `{N} Tools`
- `{N} Subagents`

Add a new badge:
- `{N} Mock Tools` — distinct color/style so it's visually differentiated from real tools.

---

## 5. API Design

### 5.1 Mock Tool Routes

| Method | Endpoint | Request Body | Response |
|--------|----------|--------------|----------|
| `GET` | `/api/mock-tools` | — | `{ data: MockTool[] }` |
| `POST` | `/api/mock-tools` | `{ name, description?, inputSchema?, mockMode, mockFixedResponse?, mockSimulationPrompt?, mockSimulationModel? }` | `{ data: MockTool }` |
| `PATCH` | `/api/mock-tools/:id` | same as POST + `id` | `{ data: MockTool }` |
| `DELETE` | `/api/mock-tools/:id` | — | `{ success: true }` |

### 5.2 Updated Agent Routes

**`GET /api/agents`**
- Existing response shape is preserved.
- `tools` array on each agent already contains all `agent_tools` rows. The frontend will inspect `toolType` to distinguish mock vs. real.

**`POST /api/agents`**
- Accepts `mockToolIds: string[]` alongside `toolIds: string[]`.
- `toolIds` → inserted into `agent_tools` with `toolType = 'mastra'`.
- `mockToolIds` → inserted into `agent_tools` with `toolType = 'mock'`.

**`PATCH /api/agents/:id`**
- Same pattern as POST: replaces all `agent_tools` rows for the agent.
- Deletes existing rows, then inserts fresh ones for both `toolIds` and `mockToolIds`.

**`GET /api/agents/:id`**
- Returns agent with `subagents`, `skills`, and `tools` (all `agent_tools` rows). Frontend filters by `toolType` to show them in the right UI section.

---

## 6. Frontend Data Flow

1. `AgentsPage` fetches `agents`, `skills`, `tools` (Mastra), and **`mock-tools`** on mount.
2. `AgentForm` receives `availableMockTools` as a prop.
3. When the form is opened (create or edit):
   - Real tool IDs are pre-selected from `agent.tools` where `toolType === 'mastra'`.
   - Mock tool IDs are pre-selected from `agent.tools` where `toolType === 'mock'`.
4. When saving:
   - `toolIds` (Mastra) and `mockToolIds` (mock) are both sent in the payload.
   - Mock tools created inline in the builder are saved to `/api/mock-tools` **before** (or as part of) the agent save. The simplest flow: save inline-created mock tools individually via POST/PATCH as the user clicks "Add" / edits, then just send IDs when saving the agent. Alternative: batch-save all mock tools with the agent payload. We will go with **individual saves** for simplicity and immediate feedback.

---

## 7. Runtime Execution (Mock Tool Factory)

### 7.1 Factory Function

In `mastra-brain`, a new module provides:

```typescript
export function createMockToolFromConfig(config: MockToolConfig) {
  return createTool({
    id: config.toolId,
    description: config.description,
    inputSchema: buildZodSchema(config.inputSchema), // [] → z.object({})
    execute: async ({ context }) => {
      if (config.mockMode === "fixed_response") {
        return config.mockFixedResponse;
      }
      if (config.mockMode === "llm_simulated") {
        const response = await callLLM(config.mockSimulationModel, {
          system: config.mockSimulationPrompt,
          user: `Tool arguments: ${JSON.stringify(context)}`,
        });
        return JSON.parse(response); // or return raw string depending on needs
      }
    },
  });
}
```

### 7.2 Schema Builder

`buildZodSchema` takes the `inputSchema` array and produces a Zod object schema:

```typescript
function buildZodSchema(params: InputParam[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const param of params) {
    let schema: z.ZodTypeAny;
    switch (param.type) {
      case "string": schema = z.string(); break;
      case "number": schema = z.number(); break;
      case "boolean": schema = z.boolean(); break;
      case "array": schema = z.array(z.any()); break;
      case "object": schema = z.record(z.any()); break;
      default: schema = z.any();
    }
    shape[param.name] = param.required ? schema : schema.optional();
  }
  return z.object(shape);
}
```

### 7.3 Integration with Agent Creation

Wherever `createDynamicAgent` (or equivalent) builds an agent's tool registry:

1. Query `mock_tools` attached to the agent via `agent_tools` (where `toolType = 'mock'`).
2. For each mock tool config, call `createMockToolFromConfig(config)`.
3. Merge the resulting tools with real Mastra tools into the final tools object passed to the agent.

---

## 8. Open Questions / Future Work

- **Standalone Mock Tools page:** A dedicated `/mock-tools` page for full CRUD without editing an agent. Deferred.
- **Error Rate slider:** Probabilistic failure simulation. Deferred.
- **Nested schema types:** Support for object/array sub-schemas in the parameter builder. Deferred.
- **JSON Schema export:** Allow exporting a mock tool's `inputSchema` as a standard JSON Schema. Deferred.

---

## 9. Files to Modify / Create

| File | Action | Purpose |
|------|--------|---------|
| `mastra-brain/src/db/schema.ts` | Add `mock_tools` table, add `toolType` to `agent_tools` | Core schema |
| `mastra-brain-playground/src/db/schema.ts` | Same as above | Playground schema |
| `mastra-brain-playground/src/app/api/mock-tools/route.ts` | Create | CRUD API for mock tools |
| `mastra-brain-playground/src/app/api/mock-tools/[id]/route.ts` | Create | PATCH/DELETE for individual mock tool |
| `mastra-brain-playground/src/app/api/agents/route.ts` | Update | Handle `mockToolIds` in POST |
| `mastra-brain-playground/src/app/api/agents/[id]/route.ts` | Update | Handle `mockToolIds` in PATCH |
| `mastra-brain-playground/src/components/agents/agent-form.tsx` | Update | Add Mock Tools builder + selector |
| `mastra-brain-playground/src/app/agents/page.tsx` | Update | Fetch mock tools, show mock tool badge |
| `mastra-brain/src/mastra/tools/mock-tool-factory.ts` | Create | Runtime factory for dynamic mock tools |
| `mastra-brain/src/mastra/tools/index.ts` (or similar) | Update | Integrate factory into agent setup |

---

## 10. Testing Notes

- **Schema push:** Run `drizzle-kit push` in `mastra-brain/` after schema changes.
- **Golden path:** Create a mock tool with 2 parameters (string + number), attach it to an agent, run a scenario, verify the tool is callable and returns the configured response.
- **Edge case:** Create a mock tool with zero parameters, set it to LLM-simulated mode, run a scenario, verify the LLM is called with the prompt + empty arguments.

---

*Approved by Tek Loon Cheah on 2026-04-22.*
