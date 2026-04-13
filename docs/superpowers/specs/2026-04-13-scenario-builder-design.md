# Scenario Builder Page — Design Spec

## Overview

A Scenario Builder page in the mastra-brain-playground that lets users describe a scenario in free text and have a Mastra agent generate all the mock data needed to test the brain — customer-bot conversations, SR (sourcing request) data, and past supplier conversations.

## Architecture

Single structured agent approach: one `scenario-generator-agent` takes a free-text scenario description and returns all three data types in one call.

### Data Flow

```
User describes scenario (free text)
  → Frontend calls /api/scenario-generator
  → API route proxies to Mastra scenario-generator-agent
  → Agent returns { conversationMessages, srData, pastSupplierConversation }
  → Frontend renders results
  → "Load into Playground" → sessionStorage → navigate to / → pre-fill textareas
```

## Mastra Server: Scenario Generator Agent

**Location:** `src/mastra/agents/scenario-generator.ts` (in mastra-brain server)

**Config:**
- Model: Gemini 2.5 Flash
- No tools — pure generation agent
- Structured output via Zod schema

**System prompt responsibilities:**
1. Parse the free-text scenario for key signals: customer intent, supplier traits, product context, known/unknown facts
2. Generate all three data types in a single pass
3. Ensure internal consistency across all outputs (same product names, supplier names, pricing references)
4. Fill in any unspecified details with plausible, realistic values — the scenario defines the situation; the agent fills in realistic product details, pricing, specs, and quantities

**Registration:** Add to `src/mastra/index.ts` alongside existing agents.

### Output Schema

```typescript
{
  conversationMessages: ConversationMessage[],     // customer <-> bot chat
  srData: SRData[],                               // sourcing request data (array, can have multiple items)
  pastSupplierConversation: ConversationMessage[]  // sourcy <-> supplier chat
}
```

**ConversationMessage** (existing format):
```typescript
{ role: "user" | "assistant", content: string, image?: string }
```

**SRData** (matches existing sourcing request structure):
```typescript
{
  runId: string,
  original_requirement: {
    title: string,
    description: string,
    reference_images: string[],
    target_price: number | null,
    target_price_currency: string,
    target_quantity: number,
    target_quantity_unit: string,
    needs_customization: boolean,
    num_options: number,
    customization_reference_url: string[],
    customization_type: string | null,
    customization_description: string | null
  },
  specs: {
    veto_specs: VetoSpec[],
    re_rank_specs: ReRankSpec[]
  },
  reference_images: string[],
  sourcing_type: string
}
```

**VetoSpec:**
```typescript
{
  spec_id: number,
  spec_name: string,
  mandatory_values: string[],
  unacceptable_values: string[],
  spec_type: string,
  source: string,
  text_confirmation: boolean,
  classification: string,
  matching_rule: string,
  reasoning: string,
  veto_score: number,
  priority_signal: string
}
```

## Frontend API Route

**Location:** `src/app/api/scenario-generator/route.ts`

- Accepts `POST { scenario: string }`
- Forwards to Mastra agent at `/api/agents/scenario-generator/generate`
- Parses and returns the structured JSON

## Frontend: Scenario Builder Page

**Route:** `/scenario-builder`

**Layout:**

Left side — Scenario Input:
- Large textarea for free-text scenario description
- "Generate Scenario" button
- Loading state while agent generates

Right side — Generated Results:
- Three collapsible sections:
  1. **Customer-Bot Conversation** — chat message bubbles (ConversationMessage format)
  2. **SR Data** — structured JSON preview (formatted, collapsible)
  3. **Supplier Conversation** — chat message bubbles (same format as customer-bot)
- "Copy" button per section to copy raw JSON
- "Load into Playground" button at bottom

### New Components

- `src/components/scenario-input.tsx` — textarea + generate button
- `src/components/generated-results.tsx` — container with three collapsible sections
- `src/components/chat-preview.tsx` — reusable chat bubble renderer (for both conversation types)

### Updated Components

- `src/components/ui/sidebar.tsx` — add "Scenario Builder" nav link to `/scenario-builder`
- `src/app/page.tsx` — on mount, read from `sessionStorage` and pre-fill textareas

### State Management

- Scenario Builder: local React state for input, loading, generated results
- "Load into Playground": writes to `sessionStorage` keys (`scenario_conversation`, `scenario_sr_data`, `scenario_supplier_chat`), then `router.push('/')`
- Playground page: `useEffect` reads `sessionStorage` on mount, pre-fills textareas, clears keys after reading (one-time load)

### No New Dependencies

Everything uses existing shadcn/ui components, React state, and `sessionStorage`.