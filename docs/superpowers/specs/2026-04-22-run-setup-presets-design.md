# Run Setup Presets Design Spec

## Problem

Currently, creating a new run in the playground requires two searches: first pick an agent, then pick a scenario. The "Brain" agent is used most frequently, so this extra step feels unnecessary. We want to let users click a preset (e.g., "Brain") to pre-fill the agent, reducing the flow to a single scenario selection.

## Goals

- Reduce clicks for the most common run setup path.
- Keep the agent choice visible for clarity (read-only chip).
- Allow users to create new presets inline.
- Stay consistent with the existing stone/amber design system.

## Non-Goals

- Presets that pre-select scenarios.
- A standalone presets management page (out of scope).
- Editable/deletable presets from the UI (v1 is create-only).

## Architecture

### Database

Add a `presets` table to `src/db/schema.ts`:

| Column      | Type                        | Constraints                      |
|-------------|-----------------------------|----------------------------------|
| id          | uuid                        | PK, defaultRandom()              |
| name        | varchar(255)                | notNull                          |
| agentId     | uuid                        | FK → agents.id, cascade delete   |
| createdAt   | timestamp                   | defaultNow, notNull                |
| updatedAt   | timestamp                   | defaultNow, notNull                |

### API

| Route              | Method | Description                              |
|--------------------|--------|------------------------------------------|
| /api/presets       | GET    | List presets, joined with agent name     |
| /api/presets       | POST   | Create a new preset (name, agentId)      |

No changes to `/api/runs` — it already accepts `agentId` + `scenarioId`.

### Component Changes

**RunSetup (`src/components/runs/run-setup.tsx`)**
- Fetch presets on mount.
- Render preset chips row below the dialog title, above the form.
- When a preset is selected:
  - Set `selectedAgentId` from the preset.
  - Swap the `SearchableSelect` agent field for a read-only chip (Badge with agent name + × to clear).
  - Keep the scenario dropdown as the first interactive focus.
- When no preset is selected:
  - Show the full `SearchableSelect` agent field as today.
  - Show a small "Save as preset" link next to the agent field (only when an agent is selected).
- Inline preset creation:
  - Clicking "Save as preset" reveals a compact inline input + Save/Cancel buttons.
  - On save, `POST /api/presets`, then refresh the presets list.

## UI Details

### Preset Chips Row
- Horizontal flex row with `gap-2`.
- Chip styling:
  - Default: `variant="outline"`, stone border.
  - Selected: `bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700`.
- Each chip shows the preset name.
- A small "×" on the selected chip clears the preset and restores manual agent selection.

### Read-Only Agent Chip (preset active)
- Replaces the `SearchableSelect` agent field entirely when a preset is selected.
- Compact `Badge` showing the agent name.
- Includes a small "×" to deselect the preset.
- Helper text changes to "Agent locked by preset. Click × to change."

### Inline "Save as Preset"
- Appears as a small text link (`text-amber-600 hover:text-amber-700 text-xs`) next to the agent `SearchableSelect` label when an agent is manually selected.
- Clicking expands a small inline row:
  - `Input` for the preset name (pre-filled with the agent name, editable).
  - "Save" button (small, amber).
  - "Cancel" text button.
- On success, the new preset chip appears in the row and the inline form collapses.

## Data Flow

1. Dialog opens → `RunSetup` mounts → parallel fetch:
   - `/api/presets`
   - `/api/agents/search`
   - `/api/scenarios/search`
2. Presets render as chips.
3. User clicks "Brain" preset:
   - `selectedAgentId` = preset.agentId
   - `selectedPresetId` = preset.id
   - Agent dropdown swaps for read-only chip.
4. User picks scenario → `Launch` enables.
5. User clicks "Save as preset" (when no preset active, agent selected):
   - Inline form appears.
   - User types name, clicks Save.
   - `POST /api/presets` → on success, re-fetch presets.
   - New chip appears selected.
6. Launch → `POST /api/runs` with `agentId` + `scenarioId`.

## Error Handling

- **Presets fetch fails:** Show chips row in an empty/error state with a retry button. Do not block the rest of the form — manual agent selection still works.
- **Preset points to a deleted agent:** Filter out server-side with an inner join so invalid presets never reach the UI.
- **Preset creation fails (duplicate name, missing agentId):** Show inline error below the input, keep the form open.

## State Model

```ts
interface Preset {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
}

// RunSetup local state additions
const [presets, setPresets] = useState<Preset[]>([]);
const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
const [isCreatingPreset, setIsCreatingPreset] = useState(false);
const [newPresetName, setNewPresetName] = useState("");
```

## Testing Checklist

- [ ] Clicking a preset pre-fills the agent and swaps the agent dropdown for a read-only chip.
- [ ] Clearing a preset restores the agent dropdown.
- [ ] "Save as preset" only appears when an agent is manually selected and no preset is active.
- [ ] Creating a preset adds it to the chips row and selects it automatically.
- [ ] `Launch` is disabled until a scenario is selected, regardless of preset state.
- [ ] Run creation payload still contains the correct `agentId`.
- [ ] Duplicate preset name shows an inline error.
