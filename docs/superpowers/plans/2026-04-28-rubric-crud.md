# Plan: Rubric CRUD Feature

## Overview

Implement a full CRUD (Create, Read, Update, Delete) interface for **Rubrics** in the `mastra-brain-playground` project. Rubrics are multi-dimensional scoring criteria used by judge agents to evaluate AI agent conversations.

## Domain Model

Based on the existing `skillstester` implementation, a Rubric has the following structure:

```typescript
type RubricDimension = {
  name: string; // e.g., "instruction-adherence"
  description: string; // e.g., "Did the agent follow instructions?"
  weight: number; // e.g., 1.5 (importance weight)
  scoringCriteria: string; // e.g., "5: Perfect. 1: Ignored."
  scale: {
    min: number; // e.g., 1
    max: number; // e.g., 5
  };
};

type Rubric = {
  id: string; // UUID (auto-generated)
  name: string; // e.g., "Default Rubric"
  description: string; // Optional description
  dimensions: RubricDimension[]; // Array of scoring dimensions
  passingThreshold?: number; // Optional weighted average threshold to pass
  createdAt: Date;
  updatedAt: Date;
};
```

## Database Schema

Add to `mastra-brain-playground/src/db/schema.ts`:

```typescript
export const rubrics = pgTable("rubrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dimensions: jsonb("dimensions")
    .$type<RubricDimension[]>()
    .notNull()
    .default([]),
  passingThreshold: jsonb("passing_threshold").$type<number>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Rubric = typeof rubrics.$inferSelect;
export type NewRubric = typeof rubrics.$inferInsert;
```

## Implementation Steps

### Phase 1: Backend (API Layer)

#### 1.1 Database Migration

- **File**: Generate a new Drizzle migration
- **Action**: Add the `rubrics` table to the PostgreSQL schema
- **Details**:
  - Primary key: `uuid` auto-generated
  - `dimensions` stored as `jsonb` for flexible schema
  - Timestamps with `defaultNow()`

#### 1.2 API Routes - Collection (`/api/rubrics`)

**File**: `mastra-brain-playground/src/app/api/rubrics/route.ts`

**Methods**:

- `GET /api/rubrics` - List all rubrics ordered by `createdAt DESC`
  - Returns: `{ data: Rubric[] }`
- `POST /api/rubrics` - Create new rubric
  - Body: `{ name, description?, dimensions, passingThreshold? }`
  - Validation: `name` required, `dimensions` must be array with valid structure
  - Returns: Created `Rubric` object

#### 1.3 API Routes - Item (`/api/rubrics/[id]`)

**File**: `mastra-brain-playground/src/app/api/rubrics/[id]/route.ts`

**Methods**:

- `GET /api/rubrics/[id]` - Get single rubric by ID
  - Returns: `Rubric` or 404
- `PUT /api/rubrics/[id]` - Update rubric
  - Body: Partial rubric fields (only provided fields updated)
  - Validation: Same as POST
  - Returns: Updated `Rubric` or 404
- `DELETE /api/rubrics/[id]` - Delete rubric
  - Returns: 200 on success, 404 if not found
  - **Constraint**: Should check if rubric is referenced by judge configs (if judge config table exists) before deleting

### Phase 2: Frontend (UI Layer)

#### 2.1 Types

**File**: `mastra-brain-playground/src/types/rubric.ts`

Define frontend types matching the API response structure.

#### 2.2 Data Fetching Hooks

Following the existing pattern in the project (see `app/api/*` routes), create React hooks for rubric operations:

- `useRubrics()` - Fetch all rubrics (GET /api/rubrics)
- `useRubric(id)` - Fetch single rubric (GET /api/rubrics/[id])
- `useCreateRubric()` - Mutation for creating (POST /api/rubrics)
- `useUpdateRubric()` - Mutation for updating (PUT /api/rubrics/[id])
- `useDeleteRubric()` - Mutation for deleting (DELETE /api/rubrics/[id])

**Note**: The project currently uses direct `fetch` in components. Consider creating a small hook layer or continuing with inline fetch calls.

#### 2.3 List Page (`/rubrics`)

**File**: `mastra-brain-playground/src/app/rubrics/page.tsx`

**Layout**:

- Page header with title "Rubrics" and "Create Rubric" button
- Data table displaying rubrics with columns:
  - **Name** - Clickable link to detail/edit view
  - **Description** - Truncated if long
  - **Dimensions** - Count of dimensions (e.g., "7 dimensions")
  - **Passing Threshold** - Displayed if set
  - **Created At** - Formatted date
  - **Actions** - Edit and Delete buttons

**Features**:

- Empty state when no rubrics exist
- Loading skeleton while fetching
- Error toast on fetch failure
- Delete confirmation dialog
- Search/filter by name (optional enhancement)

**Sample UI** (matching the attached screenshot):

```
┌─────────────────────────────────────────────────────────┐
│  Rubrics                                    [+ Create]  │
├─────────────────────────────────────────────────────────┤
│  Name          │ Description │ Dimensions │ Created     │ │
├─────────────────────────────────────────────────────────┤
│  Default       │ Standard    │ 7 dims     │ Apr 28, 2026│ │
│  Rubric        │ evaluation  │            │             │ │
│                │ criteria    │            │             │ │
├─────────────────────────────────────────────────────────┤
│  Quality Check │ Focused on  │ 3 dims     │ Apr 27, 2026│ │
│                │ response    │            │             │ │
│                │ quality     │            │             │ │
└─────────────────────────────────────────────────────────┘
```

#### 2.4 Create/Edit Page (`/rubrics/new` and `/rubrics/[id]/edit`)

**Files**:

- `mastra-brain-playground/src/app/rubrics/new/page.tsx`
- `mastra-brain-playground/src/app/rubrics/[id]/edit/page.tsx`

**Form Fields**:

- **Name** (required) - Text input
- **Description** - Textarea (optional)
- **Passing Threshold** - Number input (optional)
- **Dimensions** - Dynamic array editor:
  - Each dimension has:
    - Name (text input)
    - Description (text input)
    - Weight (number input)
    - Scale Min (number input)
    - Scale Max (number input)
    - Scoring Criteria (textarea - describes what each score means)
  - Ability to add/remove dimensions
  - Reorder dimensions (drag-and-drop or up/down buttons)

**Actions**:

- "Save" button - Submits to API
- "Cancel" button - Returns to list
- Validation errors displayed inline

#### 2.5 Detail Page (`/rubrics/[id]`)

**File**: `mastra-brain-playground/src/app/rubrics/[id]/page.tsx`

**Layout**:

- Display rubric details in read-only view
- Show all dimensions in a card/grid layout
- Actions: Edit button, Delete button
- Back navigation to list

### Phase 3: Navigation Integration

#### 3.1 Sidebar Navigation

**File**: Update the sidebar component (likely in `components/ui/sidebar.tsx` or layout)

Add "Rubrics" as a new navigation item in the sidebar, positioned logically with other configuration items (Agents, Skills, References, etc.).

**Icon**: Use `Scale` or `ClipboardCheck` from lucide-react (consistent with existing UI).

### Phase 4: Validation & Error Handling

#### 4.1 Server-Side Validation

- `name`: Required, max 255 chars
- `dimensions`: Required array, each item must have:
  - `name`: Required
  - `description`: Required
  - `weight`: Required, positive number
  - `scale.min`: Required, number
  - `scale.max`: Required, number, must be > min
  - `scoringCriteria`: Required
- `passingThreshold`: Optional, must be within scale bounds if provided

#### 4.2 Client-Side Validation

- Same rules as server-side
- Inline validation before submission
- Disable submit button until form is valid

#### 4.3 Error Handling

- API errors shown as toast notifications
- Network failures with retry option
- 409 Conflict when deleting referenced rubric

## Files to Create/Modify

### New Files

```
mastra-brain-playground/src/db/migrations/XXXX_add_rubrics_table.sql
mastra-brain-playground/src/app/api/rubrics/route.ts
mastra-brain-playground/src/app/api/rubrics/[id]/route.ts
mastra-brain-playground/src/app/rubrics/page.tsx
mastra-brain-playground/src/app/rubrics/new/page.tsx
mastra-brain-playground/src/app/rubrics/[id]/page.tsx
mastra-brain-playground/src/app/rubrics/[id]/edit/page.tsx
mastra-brain-playground/src/types/rubric.ts
mastra-brain-playground/src/components/rubrics/rubric-form.tsx
mastra-brain-playground/src/components/rubrics/dimension-editor.tsx
```

### Modified Files

```
mastra-brain-playground/src/db/schema.ts          (add rubrics table)
mastra-brain-playground/src/db/index.ts           (export rubrics)
mastra-brain-playground/src/app/layout.tsx        (sidebar nav)
```

## Acceptance Criteria

- [ ] Rubrics table exists in database with proper schema
- [ ] `GET /api/rubrics` returns all rubrics ordered by creation date
- [ ] `POST /api/rubrics` creates a new rubric with validation
- [ ] `GET /api/rubrics/[id]` returns a specific rubric
- [ ] `PUT /api/rubrics/[id]` updates an existing rubric
- [ ] `DELETE /api/rubrics/[id]` deletes a rubric (with conflict check)
- [ ] List page displays rubrics in a table with actions
- [ ] Create page has a form with dimension editor
- [ ] Edit page pre-populates existing data
- [ ] Detail page shows read-only view of rubric
- [ ] Sidebar includes Rubrics navigation item
- [ ] All operations show appropriate loading/error states
- [ ] Responsive design works on desktop and mobile

## References

- **Existing CRUD Patterns**:
  - `app/api/skills/*` - Skill CRUD API
  - `app/api/references/*` - Reference CRUD API
  - `app/skills/page.tsx` - Skill list UI
  - `components/skill-editor-dialog.tsx` - Skill form UI
- **skillstester Implementation**:
  - `skillstester/src/types/index.ts` - Rubric type definitions
  - `skillstester/src/api/routes/judge-configs.ts` - Rubric API routes
  - `skillstester/src/storage/repositories/judge-configs.ts` - Rubric repository
  - `skillstester/src/storage/schema-sp4.ts` - SQLite schema
