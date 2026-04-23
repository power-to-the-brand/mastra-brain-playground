# Agent Modules Design Spec

## Goal
Allow users to group agents under named, colored modules for organizational clarity on the agents page. Each agent belongs to exactly one module (or is uncategorized). Modules are lightweight entities with only name and color.

## Database Schema

### New Table: `modules`
```typescript
export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 50 }).notNull().default("amber"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
```

### Updated Table: `agents`
Add a nullable foreign key to modules:
```typescript
export const agents = pgTable("agents", {
  // ... existing columns ...
  moduleId: uuid("module_id").references(() => modules.id, { onDelete: "set null" }),
});
```

- `onDelete: "set null"` — deleting a module ungroups its agents into "Uncategorized".

## API Surface

| Route | Methods | Purpose |
|---|---|---|
| `/api/modules` | `GET`, `POST` | List all modules; create a module |
| `/api/modules/[id]` | `PATCH`, `DELETE` | Update module name/color; delete a module |
| `GET /api/agents` | (no change) | Continue returning agents with `moduleId` field; frontend joins against modules list |
| `POST /api/agents` | (updated body) | Accept `moduleId` in the request body |
| `PATCH /api/agents/[id]` | (updated body) | Accept `moduleId` in the request body |

## UI Changes

### Agents Page (`src/app/agents/page.tsx`)
- Replace the card grid with a **grouped table view**.
- Each module is a collapsible accordion-style row group.
- Module header: color dot + module name + expand/collapse arrow.
- Agents with `null` moduleId render under an "Uncategorized" group.
- Each row: Name, Model, Skills count, Description (truncated), inline Edit/Delete actions.
- Top toolbar: "Create Agent" button + **"Manage Modules"** button (opens a dialog for module CRUD).

### AgentForm (`src/components/agents/agent-form.tsx`)
- Add a "Module (optional)" dropdown field.
- Options: all existing modules + "— None —" (null).
- Display a small color dot next to the selected module name.
- Submit payload includes `moduleId` (nullable).

### Module Manager Dialog
- Inline on the agents page (no separate page).
- List existing modules with inline rename and color picker.
- Button to create a new module (name input + color selector).
- Button to delete a module (confirmation prompt).

### Color Palette
Pre-defined Tailwind color keys:
- `amber` (default)
- `blue`
- `emerald`
- `rose`
- `violet`
- `slate`
- `cyan`

## Data Flow

1. Page loads → fetch `/api/agents` and `/api/modules` in parallel.
2. Frontend groups agent array by `moduleId` (or `null` for uncategorized).
3. Grouped agents are rendered inside collapsible table sections keyed by module.
4. Editing an agent opens `AgentForm` with the current `moduleId` pre-selected.
5. Saving the form PATCHes `/api/agents/[id]` with the (possibly new) `moduleId`.

## Error Handling
- If `/api/modules` fails, show an inline error toast but still render agents ungrouped.
- Deleting a module that has agents is allowed; agents become uncategorized (`onDelete: "set null"`).
- Creating a module with a duplicate name is allowed (no unique constraint on name).

## Testing Considerations
- Verify that agents without a module appear under "Uncategorized".
- Verify that deleting a module correctly ungroups its agents.
- Verify that the module dropdown in `AgentForm` reflects newly created modules without a full page reload.
