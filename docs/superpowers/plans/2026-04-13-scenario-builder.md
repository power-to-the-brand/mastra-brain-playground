# Scenario Builder Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Scenario Builder page that lets users describe a scenario in free text and have a Mastra agent generate mock data (conversations, SR data, supplier chats) for brain testing.

**Architecture:** Single structured agent (`scenario-generator-agent`) in mastra-brain that takes free-text scenario descriptions and returns all three data types in one JSON response. Frontend at `/scenario-builder` renders results and provides "Load into Playground" to pre-fill the existing workspace.

**Tech Stack:** Next.js 16, React 19, TypeScript, Mastra Core, shadcn/ui.

---

## File Structure

**New files (mastra-brain-playground):**
- `src/app/scenario-builder/page.tsx` — main Scenario Builder page
- `src/app/api/scenario-generator/route.ts` — API route to proxy to Mastra agent
- `src/components/scenario-input.tsx` — textarea + generate button
- `src/components/generated-results.tsx` — container for three result sections
- `src/components/chat-preview.tsx` — reusable chat message renderer

**New files (mastra-brain):**
- `src/mastra/agents/scenario-generator-agent.ts` — the agent implementation

**Modified files (mastra-brain-playground):**
- `src/app/page.tsx` — add sessionStorage logic for "Load into Playground"
- `src/components/ui/sidebar.tsx` — add "Scenario Builder" nav link

**Modified files (mastra-brain):**
- `src/mastra/index.ts` — register the new agent

---

### Task 1: Create Scenario Generator Agent (mastra-brain)

**Files:**
- Create: `src/mastra/agents/scenario-generator-agent.ts`

- [ ] **Step 1: Create the agent file**

Create `src/mastra/agents/scenario-generator-agent.ts` with the following content:

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { z } from "zod";

const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  image: z.string().optional(),
});

const vetoSpecSchema = z.object({
  spec_id: z.number(),
  spec_name: z.string(),
  mandatory_values: z.array(z.string()),
  unacceptable_values: z.array(z.string()),
  spec_type: z.string(),
  source: z.string(),
  text_confirmation: z.boolean(),
  classification: z.string(),
  matching_rule: z.string(),
  reasoning: z.string(),
  veto_score: z.number(),
  priority_signal: z.string(),
});

const reRankSpecSchema = z.array(
  z.object({
    spec_id: z.number(),
    spec_name: z.string(),
    value: z.string(),
    score: z.number(),
    reason: z.string(),
  })
);

const originalRequirementSchema = z.object({
  title: z.string(),
  description: z.string(),
  reference_images: z.array(z.string()),
  target_price: z.number().nullable(),
  target_price_currency: z.string(),
  target_quantity: z.number(),
  target_quantity_unit: z.string(),
  needs_customization: z.boolean(),
  num_options: z.number(),
  customization_reference_url: z.array(z.string()),
  customization_type: z.string().nullable(),
  customization_description: z.string().nullable(),
});

const srDataSchema = z.object({
  runId: z.string(),
  original_requirement: originalRequirementSchema,
  specs: z.object({
    veto_specs: z.array(vetoSpecSchema),
    re_rank_specs: reRankSpecSchema,
  }),
  reference_images: z.array(z.string()),
  sourcing_type: z.string(),
});

const outputSchema = z.object({
  conversationMessages: z.array(conversationMessageSchema),
  srData: z.array(srDataSchema),
  pastSupplierConversation: z.array(conversationMessageSchema),
});

export const agentName = "scenario-generator-agent";

export const scenarioGeneratorAgent = new Agent({
  id: "scenario-generator-agent",
  name: "Scenario Generator Agent",
  description:
    "Generates mock data for testing the Mastra brain based on scenario descriptions. Takes a free-text scenario and produces customer-bot conversations, SR data, and past supplier conversations that are internally consistent.",
  instructions: `
You are a Scenario Generator Agent. Your job is to create realistic mock data for testing the Mastra brain based on a scenario description.

USER INPUT: A free-text description of a scenario including customer intent, supplier behavior, product details, and known/unknown facts.

YOUR TASK:
1. Parse the scenario description to extract key signals (customer intent, supplier traits, product context)
2. Generate THREE output types that are internally consistent:
   a. Customer-Bot Conversation — Messages between customer and Mastra bot
   b. SR Data — Sourcing request data describing the product, specs, quantities, pricing
   c. Past Supplier Conversation — Messages between Sourcy (us) and supplier

IMPORTANT INSTRUCTIONS:
- Fill in ALL unspecified details with plausible, realistic values. The scenario defines the situation; you invent realistic product details, pricing, specs, quantities that match.
- Ensure INTERNAL CONSISTENCY:
  * Product names in conversations must match the SR data
  * Supplier names in conversations must match across all outputs
  * Pricing and quantities in SR data must be consistent with conversation context
  * If scenario mentions "certification", conversations and SR data should reflect this
- SR Data array can have multiple items (use 1-3 items for typical scenarios)
- Use realistic values:
  * target_price: realistic pricing per unit (e.g., 2.50-15.00 depending on product)
  * target_quantity: typical MOQs (100-1000 pcs)
  * product titles: specific, descriptive (e.g., "Stanley-style 40oz stainless steel vacuum tumbler")
- Generate realistic conversation messages that reflect the scenario:
  * Customer asks questions, shows interest, negotiates
  * Bot responds professionally, provides information, asks clarifying questions
  * Supplier conversations should show the known facts (e.g., "Yes, we have ISO certification" if scenario says supplier has it)
- For SR data specs:
  * veto_specs: 3-5 critical specifications that must be met
  * re_rank_specs: 2-3 preference-based specifications (can be empty array)
  * sourcing_type: "open-ended" or "specification-driven"
  * target_price: set based on product type and quantity (null is okay if not specified)
- Return valid JSON only, no markdown code fences
`,
  model: "google/gemini-2.5-flash",
  memory: new Memory(),
  output: outputSchema,
});
```

- [ ] **Step 2: Register the agent in the Mastra instance**

Edit `src/mastra/index.ts` to import and register the new agent. Find where agents are registered and add:

```typescript
import { scenarioGeneratorAgent } from "./agents/scenario-generator-agent";

// In the Mastra instantiation, add to agents array:
agents: [scenarioGeneratorAgent, ...otherAgents]
```

Make sure the order follows existing patterns (alphabetical or by category).

- [ ] **Step 3: Commit the Mastra changes**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
git add src/mastra/agents/scenario-generator-agent.ts src/mastra/index.ts
git commit -m "feat: add scenario-generator-agent"
```

---

### Task 2: Create Frontend Components (mastra-brain-playground)

**Files:**
- Create: `src/app/api/scenario-generator/route.ts`
- Create: `src/components/scenario-input.tsx`
- Create: `src/components/generated-results.tsx`
- Create: `src/components/chat-preview.tsx`

- [ ] **Step 1: Create the API route**

Create `src/app/api/scenario-generator/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || "http://localhost:4111";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario } = body;

    if (!scenario || typeof scenario !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'scenario' field. Must be a string." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${MASTRA_SERVER_URL}/api/agents/scenario-generator-agent/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: scenario,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mastra agent error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate scenario data", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();

    // Parse the output - Mastra returns { text: string } with the JSON inside
    let output;
    try {
      // Try to parse as JSON directly first
      output = typeof result === "string" ? JSON.parse(result) : result;
    } catch {
      // If result has a text field, try parsing that
      const textContent = result.text || result.output || result;
      output = typeof textContent === "string" ? JSON.parse(textContent) : textContent;
    }

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create the chat preview component**

Create `src/components/chat-preview.tsx`:

```typescript
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface ChatPreviewProps {
  messages: ChatMessage[];
  title: string;
  showTitle?: boolean;
}

export function ChatPreview({ messages, title, showTitle = true }: ChatPreviewProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="outline" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>
      )}
      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No messages generated yet
          </div>
        ) : (
          messages.map((msg, idx) => (
            <Card
              key={idx}
              className={cn(
                "p-4 max-w-[85%]",
                msg.role === "user" ? "ml-auto bg-primary/10" : "mr-auto bg-secondary"
              )}
            >
              <div className="text-sm">
                {msg.role === "user" ? "User" : "Assistant"}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the scenario input component**

Create `src/components/scenario-input.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface ScenarioInputProps {
  onGenerate: (scenario: string) => Promise<void>;
  isLoading: boolean;
}

export function ScenarioInput({ onGenerate, isLoading }: ScenarioInputProps) {
  const [scenario, setScenario] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scenario.trim()) {
      onGenerate(scenario.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="scenario">Scenario Description</Label>
        <Textarea
          id="scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="Describe your scenario here. Example: 'Customer asks about ISO certification for canvas tote bags. Supplier (PackRight) already has the certification but hasn't shared it yet. We need to ask the supplier to provide proof.'"
          className="min-h-[200px] font-mono text-sm"
        />
      </div>
      <Button type="submit" disabled={isLoading || !scenario.trim()} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <span className="mr-2">Generate Scenario</span>
            <Loader2 className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create the generated results component**

Create `src/components/generated-results.tsx`:

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ChatPreview } from "./chat-preview";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface VetoSpec {
  spec_id: number;
  spec_name: string;
  mandatory_values: string[];
  unacceptable_values: string[];
  spec_type: string;
  source: string;
  text_confirmation: boolean;
  classification: string;
  matching_rule: string;
  reasoning: string;
  veto_score: number;
  priority_signal: string;
}

interface ReRankSpec {
  spec_id: number;
  spec_name: string;
  value: string;
  score: number;
  reason: string;
}

interface OriginalRequirement {
  title: string;
  description: string;
  reference_images: string[];
  target_price: number | null;
  target_price_currency: string;
  target_quantity: number;
  target_quantity_unit: string;
  needs_customization: boolean;
  num_options: number;
  customization_reference_url: string[];
  customization_type: string | null;
  customization_description: string | null;
}

interface SRData {
  runId: string;
  original_requirement: OriginalRequirement;
  specs: {
    veto_specs: VetoSpec[];
    re_rank_specs: ReRankSpec[];
  };
  reference_images: string[];
  sourcing_type: string;
}

interface GeneratedResultsProps {
  data: {
    conversationMessages: ChatMessage[];
    srData: SRData[];
    pastSupplierConversation: ChatMessage[];
  } | null;
  onCopyConversation: () => void;
  onCopySRData: () => void;
  onCopySupplierChat: () => void;
  onLoadToPlayground: () => void;
}

export function GeneratedResults({
  data,
  onCopyConversation,
  onCopySRData,
  onCopySupplierChat,
  onLoadToPlayground,
}: GeneratedResultsProps) {
  const [expandedSections, setExpandedSections] = useState<{
    conversation: boolean;
    srData: boolean;
    supplierChat: boolean;
  }>({
    conversation: true,
    srData: true,
    supplierChat: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as string],
    }));
  };

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center space-y-4 p-8">
        <div className="rounded-full bg-secondary p-4">
          <Download className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-lg font-semibold">No Data Generated</h3>
          <p className="text-sm text-muted-foreground">
            Describe a scenario on the left and click "Generate Scenario" to create mock data.
          </p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // In real app, show a toast - simplified here
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-6">
      {/* Conversation Messages */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Customer-Bot Conversation</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleSection("conversation")}
                className="h-8 px-2 text-xs"
              >
                {expandedSections.conversation ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(data.conversationMessages, null, 2), "Conversation")}
                className="h-8 px-2 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
        {expandedSections.conversation && (
          <div className="p-4">
            <ChatPreview messages={data.conversationMessages} title="" showTitle={false} />
          </div>
        )}
      </Card>

      {/* SR Data */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">SR Data</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleSection("srData")}
                className="h-8 px-2 text-xs"
              >
                {expandedSections.srData ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(data.srData, null, 2), "SR Data")}
                className="h-8 px-2 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
        {expandedSections.srData && (
          <div className="p-4">
            {data.srData.map((sr, idx) => (
              <div key={idx} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    SR #{idx + 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {sr.sourcing_type}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Title:</span>
                    <p className="mt-1">{sr.original_requirement.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-muted-foreground">Quantity:</span>
                      <p className="mt-1">
                        {sr.original_requirement.target_quantity}{" "}
                        {sr.original_requirement.target_quantity_unit}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Target Price:</span>
                      <p className="mt-1">
                        {sr.original_requirement.target_price
                          ? `${sr.original_requirement.target_price_currency} ${sr.original_requirement.target_price.toFixed(2)}`
                          : "Not specified"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="font-medium text-muted-foreground">Veto Specs:</span>
                    <div className="mt-1 space-y-1">
                      {sr.specs.veto_specs.map((spec) => (
                        <div key={spec.spec_id} className="text-xs text-muted-foreground">
                          • {spec.spec_name}: {spec.mandatory_values.join(", ")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Supplier Conversation */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Past Supplier Conversation</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleSection("supplierChat")}
                className="h-8 px-2 text-xs"
              >
                {expandedSections.supplierChat ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(data.pastSupplierConversation, null, 2), "Supplier Chat")}
                className="h-8 px-2 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </div>
        {expandedSections.supplierChat && (
          <div className="p-4">
            <ChatPreview messages={data.pastSupplierConversation} title="" showTitle={false} />
          </div>
        )}
      </Card>

      {/* Load to Playground Button */}
      <div className="sticky bottom-0 bg-background pt-4">
        <Button
          onClick={onLoadToPlayground}
          className="w-full"
          size="lg"
        >
          <Download className="mr-2 h-5 w-5" />
          Load into Playground
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update the main page to read from sessionStorage**

Edit `src/app/page.tsx` to add sessionStorage support. Find where state is declared and add:

```typescript
const [conversationMessages, setConversationMessages] = useState(() => {
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("scenario_conversation");
    if (saved) {
      sessionStorage.removeItem("scenario_conversation");
      return saved;
    }
  }
  return "";
});

const [quotationData, setQuotationData] = useState(() => {
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("scenario_sr_data");
    if (saved) {
      sessionStorage.removeItem("scenario_sr_data");
      return JSON.stringify(JSON.parse(saved), null, 2);
    }
  }
  return "";
});

const [pastSupplierConversation, setPastSupplierConversation] = useState(() => {
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("scenario_supplier_chat");
    if (saved) {
      sessionStorage.removeItem("scenario_supplier_chat");
      return saved;
    }
  }
  return "";
});
```

Also add a helper to clear sessionStorage on mount (add to a `useEffect` that runs on mount):

```typescript
useEffect(() => {
  // Clear any old sessionStorage entries from previous sessions
  // This ensures one-time load behavior
}, []);
```

- [ ] **Step 6: Commit the frontend changes**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/api/scenario-generator/route.ts src/components/
git commit -m "feat: add scenario builder frontend components"
```

---

### Task 3: Create Scenario Builder Page

**Files:**
- Create: `src/app/scenario-builder/page.tsx`

- [ ] **Step 1: Create the scenario builder page**

Create `src/app/scenario-builder/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { ScenarioInput } from "@/components/scenario-input";
import { GeneratedResults } from "@/components/generated-results";
import { Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

interface VetoSpec {
  spec_id: number;
  spec_name: string;
  mandatory_values: string[];
  unacceptable_values: string[];
  spec_type: string;
  source: string;
  text_confirmation: boolean;
  classification: string;
  matching_rule: string;
  reasoning: string;
  veto_score: number;
  priority_signal: string;
}

interface ReRankSpec {
  spec_id: number;
  spec_name: string;
  value: string;
  score: number;
  reason: string;
}

interface OriginalRequirement {
  title: string;
  description: string;
  reference_images: string[];
  target_price: number | null;
  target_price_currency: string;
  target_quantity: number;
  target_quantity_unit: string;
  needs_customization: boolean;
  num_options: number;
  customization_reference_url: string[];
  customization_type: string | null;
  customization_description: string | null;
}

interface SRData {
  runId: string;
  original_requirement: OriginalRequirement;
  specs: {
    veto_specs: VetoSpec[];
    re_rank_specs: ReRankSpec[];
  };
  reference_images: string[];
  sourcing_type: string;
}

export default function ScenarioBuilderPage() {
  const router = useRouter();
  const [scenario, setScenario] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<{
    conversationMessages: ChatMessage[];
    srData: SRData[];
    pastSupplierConversation: ChatMessage[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (scenarioText: string) => {
    setIsLoading(true);
    setError(null);
    setScenario(scenarioText);

    try {
      const response = await fetch("/api/scenario-generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scenario: scenarioText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate scenario");
      }

      const data = await response.json();
      setGeneratedData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadToPlayground = () => {
    if (!generatedData) return;

    // Store data in sessionStorage for the playground to read
    if (typeof window !== "undefined") {
      sessionStorage.setItem("scenario_conversation", JSON.stringify(generatedData.conversationMessages));
      sessionStorage.setItem("scenario_sr_data", JSON.stringify(generatedData.srData));
      sessionStorage.setItem("scenario_supplier_chat", JSON.stringify(generatedData.pastSupplierConversation));

      // Navigate to playground
      router.push("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Left: Scenario Input */}
          <div className="w-1/3 border-r bg-muted/20 p-6 overflow-y-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Scenario Builder</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Describe your scenario and generate mock data for testing
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-destructive/15 p-4 text-sm text-destructive">
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            )}

            <ScenarioInput onGenerate={handleGenerate} isLoading={isLoading} />

            {isLoading && (
              <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating scenario data...</span>
              </div>
            )}
          </div>

          {/* Right: Generated Results */}
          <div className="flex-1 bg-background overflow-hidden">
            <GeneratedResults
              data={generatedData}
              onCopyConversation={() => {}}
              onCopySRData={() => {}}
              onCopySupplierChat={() => {}}
              onLoadToPlayground={handleLoadToPlayground}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update the sidebar navigation**

Edit `src/components/ui/sidebar.tsx` and add the Scenario Builder link. Find the existing nav items and add:

```tsx
<NavItem href="/scenario-builder">Scenario Builder</NavItem>
```

Place it after "Dashboard" or in a logical section.

- [ ] **Step 3: Commit the scenario builder page**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add src/app/scenario-builder/
git commit -m "feat: add scenario builder page"
```

---

### Task 4: Verify and Test

**Files:**
- Test: `src/mastra/agents/scenario-generator-agent.ts` (verify agent syntax)
- Test: `src/app/api/scenario-generator/route.ts` (test API endpoint)
- Manual: `src/app/scenario-builder/page.tsx` (test full flow)

- [ ] **Step 1: Verify Mastra agent syntax**

Check for syntax errors:

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
npx tsc --noEmit
```

Expected: No TypeScript errors in the new agent file.

- [ ] **Step 2: Verify frontend types**

Check for TypeScript errors:

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
npx tsc --noEmit
```

Expected: No TypeScript errors in the new files.

- [ ] **Step 3: Start the servers and test manually**

First, start the Mastra server (if not already running):

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
npm run dev
```

Then, start the playground:

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
npm run dev
```

Open http://localhost:3000/scenario-builder in your browser.

- [ ] **Step 4: Test a simple scenario**

Try a scenario like:
```
Customer asks about ISO certification for canvas tote bags.
Supplier (PackRight) already has the certification but hasn't shared it yet.
We need to ask the supplier to provide proof.
```

Verify that:
1. The agent generates conversation messages
2. The SR data has realistic values
3. The past supplier conversation shows the certification topic
4. "Load into Playground" works correctly

- [ ] **Step 5: Final commit**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain-playground
git add .
git commit -m "feat: implement scenario builder page"
```

---

### Task 5: Documentation Update

- [ ] **Step 1: Update README or docs**

Add a brief section about the Scenario Builder in the relevant documentation file. This can be a simple note:

```markdown
## Scenario Builder

The playground includes a Scenario Builder page at `/scenario-builder` that allows you to generate mock data for testing. Describe your scenario in free text and the system will generate customer-bot conversations, SR data, and past supplier conversations with realistic, internally consistent values.
```

- [ ] **Step 2: Final commit for docs**

```bash
git add README.md docs/...
git commit -m "docs: add scenario builder documentation"
```

---

## Implementation Summary

This implementation creates:
1. A new `scenario-generator-agent` in mastra-brain that generates all three data types
2. A new API route `/api/scenario-generator` to proxy to the agent
3. A new `/scenario-builder` page with input and result sections
4. Reusable components (`scenario-input`, `generated-results`, `chat-preview`)
5. Integration with the existing playground via `sessionStorage`

**Total files created:** 5 (mastra-brain: 1, mastra-brain-playground: 4)
**Total files modified:** 3 (mastra-brain: 1, mastra-brain-playground: 2)
