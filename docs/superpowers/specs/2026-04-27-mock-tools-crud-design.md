# Mock Tools CRUD Page Design

## Overview

Build a full CRUD page at `/mock-tools` for managing mock tool overrides, following the table + dialog pattern used by the existing `/skills` page. Simultaneously deprecate and remove the legacy `/tools` page and its API.

## Architecture

- **Page:** `src/app/mock-tools/page.tsx` — client component, fetches data on mount.
- **Dialog:** `src/components/mock-tool-editor-dialog.tsx` — create/edit form.
- **Delete Dialog:** Inline shadcn Dialog for confirmation (not browser `confirm()`).
- **API:** Reuses existing `/api/mock-tools` (GET, POST) and `/api/mock-tools/[id]` (PATCH, DELETE). No API changes required.
- **Removed:** `src/app/tools/page.tsx` and `src/app/api/tools/route.ts`.

## Components

### `MockToolEditorDialog`

A shadcn Dialog with a form layout. Fields map directly to the `mockTools` table schema:

- **Tool ID** (`toolId`): text input, required. Enforced unique by API.
- **Name** (`name`): text input, required.
- **Description** (`description`): textarea, optional.
- **Input Schema** (`inputSchema`): JSON editor (`<textarea>` with basic JSON validation). Defaults to `[]`.
- **Mock Mode** (`mockMode`): radio group — `fixed` | `llm_simulated`.
- **Mock Fixed Response** (`mockFixedResponse`): JSON editor, visible only when `mockMode === "fixed"`.
- **Mock Simulation Prompt** (`mockSimulationPrompt`): textarea, visible only when `mockMode === "llm_simulated"`.
- **Mock Simulation Model** (`mockSimulationModel`): text input, visible only when `mockMode === "llm_simulated"`.

Validation: client-side required fields (`toolId`, `name`, `mockMode`) before submit.

### `DeleteConfirmDialog`

A small shadcn Dialog with:
- Title: "Delete Mock Tool?"
- Description: names the tool being deleted.
- Actions: **Cancel** (secondary) and **Delete** (destructive/red).

## Data Flow

1. Page mounts → `GET /api/mock-tools` → render table.
2. **Create:** Click "Create" → open dialog with empty form → POST `/api/mock-tools` → close dialog → refetch table.
3. **Edit:** Click row "Edit" button → open dialog pre-filled with row data → PATCH `/api/mock-tools/{id}` → close dialog → refetch table.
4. **Delete:** Click row "Delete" button → open `DeleteConfirmDialog` → on confirm, `DELETE /api/mock-tools/{id}` → close dialog → refetch table.
5. **Search:** Local client-side filtering by `toolId`, `name`, or `description`.

## Error Handling

- API fetch failure: show inline error banner (red alert box) in the page, not a toast.
- Save failure: show toast error (reuses existing `ToastProvider` pattern).
- Delete failure: show toast error.
- Invalid JSON in schema/fixed response: client-side parse check before submit, show inline field error.

## Testing

- Unit: test `MockToolEditorDialog` form validation (required fields, JSON parsing).
- Unit: test conditional field visibility (fixed response vs simulation fields).
- E2E: create a mock tool, verify it appears in the table, edit it, verify the update, delete it, verify it disappears.

## Data Schema (reference)

```ts
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
```

## Files to Create / Modify

- **Create:** `src/app/mock-tools/page.tsx`
- **Create:** `src/components/mock-tool-editor-dialog.tsx`
- **Delete:** `src/app/tools/page.tsx`
- **Delete:** `src/app/api/tools/route.ts`
- **Modify:** `src/components/ui/sidebar.tsx` — add `/mock-tools` nav item, remove `/tools` nav item.
