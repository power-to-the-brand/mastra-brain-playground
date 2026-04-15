# Agent Selection UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dropdown to the playground to allow users to switch between `supervisor-v3` and `piyush-supervisor` agents.

**Architecture:** Add a `selectedAgent` state to the `Home` component and update the `useChat` transport to dynamically use the selected agent's endpoint.

**Tech Stack:** Next.js (App Router), Tailwind CSS, Lucide React, AI SDK.

---

### Task 1: Add State and Update Transport Logic

**Files:**
- Modify: `mastra-brain-playground/src/app/page.tsx:68-205`

- [ ] **Step 1: Add `selectedAgent` state**

```typescript
// Inside Home component (around line 75)
const [selectedAgent, setSelectedAgent] = useState("supervisor-v3");
```

- [ ] **Step 2: Update transport useMemo**

```typescript
// Update transport useMemo (around line 200)
const transport = useMemo(
  () =>
    new DefaultChatTransport({
      api: `${MASTRA_SERVER_URL}/${selectedAgent}`,
    }),
  [selectedAgent, MASTRA_SERVER_URL],
);
```

- [ ] **Step 3: Update `onFinish` persistence**

```typescript
// Update fetch call in onFinish (around line 240)
fetch(`/api/scenario-results`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    scenarioId: scenarioId || undefined,
    finalOutput: content,
    agentName: selectedAgent, // Use selectedAgent instead of hardcoded string
  }),
})
```

- [ ] **Step 4: Commit**

```bash
git add mastra-brain-playground/src/app/page.tsx
git commit -m "feat: add selectedAgent state and dynamic transport"
```

---

### Task 2: Implement Agent Selection UI

**Files:**
- Modify: `mastra-brain-playground/src/app/page.tsx:623-646`

- [ ] **Step 1: Add Dropdown UI next to Run Brain button**

```tsx
{/* Around line 623, wrap the button and add the select */}
<div className="mt-6 pt-4 border-t border-border flex items-center gap-4">
  <Button
    size="lg"
    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-300 hover:shadow-lg focus:ring-primary/50"
    disabled={isRunningAgent}
    onClick={handleRunAgent}
  >
    {isRunningAgent ? (
      <>
        <Loader2 size={18} className="mr-2 animate-spin" />
        Running Brain...
      </>
    ) : (
      <>
        <Sparkles size={18} />
        Run Brain
      </>
    )}
  </Button>
  
  <div className="flex items-center gap-2">
    <Label htmlFor="agent-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
      Agent:
    </Label>
    <select
      id="agent-select"
      value={selectedAgent}
      onChange={(e) => setSelectedAgent(e.target.value)}
      disabled={isRunningAgent}
      className="h-10 rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="supervisor-v3">Supervisor V3</option>
      <option value="piyush-supervisor">Piyush Supervisor</option>
    </select>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add mastra-brain-playground/src/app/page.tsx
git commit -m "feat: add agent selection dropdown UI"
```

---

### Task 3: Verification

- [ ] **Step 1: Verify default state**
Check that the dropdown defaults to "Supervisor V3".

- [ ] **Step 2: Verify switching works**
Switch to "Piyush Supervisor" and click "Run Brain". Verify in the browser's Network tab that the request is sent to `http://localhost:4111/piyush-supervisor`.

- [ ] **Step 3: Verify persistence**
Check the `/api/scenario-results` request payload in the Network tab to ensure `agentName` matches the selected agent.
