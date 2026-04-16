# Scenario Generator Prompt Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `scenario-generator-agent` to produce realistic human-like feedback and handle pre-existing conversations in the input.

**Architecture:** Update the `instructions` string in the `Agent` definition to include logic for conversation detection and a feedback realism guide.

**Tech Stack:** Mastra, TypeScript, Zod.

---

### Task 1: Update Scenario Generator Agent Prompt

**Files:**
- Modify: `mastra-brain/src/mastra/agents/scenario-generator-agent.ts`

- [ ] **Step 1: Read the existing agent file**

Read `mastra-brain/src/mastra/agents/scenario-generator-agent.ts` to get the current instructions.

- [ ] **Step 2: Update the instructions string**

Update the `instructions` property of the `scenarioGeneratorAgent` with the new logic.

```typescript
// Replace the instructions property in scenario-generator-agent.ts

  instructions: `You are a Scenario Generator Agent. Your job is to create realistic mock data for testing the Mastra brain based on a scenario description.

USER INPUT: A free-text description of a scenario. This may include:
1. A description of customer intent, supplier behavior, and product details.
2. A pre-existing Customer <-> Bot conversation (e.g., "User: ... Bot: ...").

YOUR TASK:
1. PRE-PROCESSING: Analyze the user input for an existing Customer <-> Bot conversation.
   - If a conversation is present, extract it verbatim into the 'conversationMessages' output field. DO NOT generate your own conversation in this case.
   - If NO conversation is present, generate a realistic one based on the scenario description.
2. Parse the scenario description to extract key signals (customer intent, supplier traits, product context).
3. Generate FOUR output types that are internally consistent:
   a. Scenario Name - A concise, descriptive name.
   b. Customer-Bot Conversation - Messages between customer and Mastra bot (extracted or generated).
   c. SR Data - Sourcing request data describing the product, specs, quantities, pricing.
   d. Past Supplier Conversation - Messages between Sourcy (us) and supplier.

## FEEDBACK REALISM GUIDE
When generating or interpreting customer feedback, favor "Normal Human" patterns over formal technical specifications.
- Vague is realistic: Use "This is too big" instead of "Dimensions exceed spec".
- Style preference: Use "I want minimalist Scandinavian style" instead of "Aesthetic: minimalist".
- The Mastra brain needs to "think" to understand these: Ensure the conversation reflects these human patterns, while the 'srData' (veto_specs) contains the technical grounding implied by the feedback.

## REFERENCE: REAL SOURCING CONVERSATION
[... keep existing reference content ...]
`,
```

- [ ] **Step 3: Verify the changes**

Run a quick check for syntax errors in the agent file.

Run: `cd mastra-brain && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit the changes**

```bash
cd /Users/tekloon/pttb/sourcy-brain-root/mastra-brain
git add src/mastra/agents/scenario-generator-agent.ts
git commit -m "feat: improve scenario generator agent realism and conversation handling"
```

---

### Task 2: Manual Verification in Playground (Optional but Recommended)

**Files:**
- Test: Use the Scenario Builder UI in the browser.

- [ ] **Step 1: Test conversation extraction**

Input a scenario like:
"User: I want some playmats.
Bot: Sure, what size?
User: 180x200cm.
The customer is looking for XPE mats."

Verify the generated `conversationMessages` matches the input exactly.

- [ ] **Step 2: Test human-like feedback**

Input a scenario like:
"A customer looking for nursery bedding. They are very picky about design and want something minimalist."

Verify the generated messages use phrases like "I want something minimalist" or "This pattern is too busy" instead of formal specs.
