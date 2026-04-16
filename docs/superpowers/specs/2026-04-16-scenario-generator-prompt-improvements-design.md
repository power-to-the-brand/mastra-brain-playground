---
name: 2026-04-16-scenario-generator-prompt-improvements
description: Improve scenario generator agent prompt to handle human-like feedback and pre-existing conversations.
type: project
---

# Design: Scenario Generator Prompt Improvements

## Goal
Improve the `scenario-generator-agent` to produce more realistic, human-like customer feedback and handle scenarios where a conversation is provided in the input.

## Proposed Changes

### 1. Update Instructions for Feedback Realism
- Add a `## FEEDBACK REALISM` section to the agent's instructions.
- Instruct the agent to use "Normal Human" feedback patterns (e.g., "This is too big", "I want minimalist design").
- Emphasize that the brain needs to "think" to understand these vague requirements.

### 2. Handle Pre-existing Conversations
- Add a rule to detect if the user provided a customer-bot conversation in the input.
- If detected, the agent should extract it into `conversationMessages` and NOT generate its own.
- All other generated data (`srData`, `pastSupplierConversation`) must remain consistent with the provided conversation.

### 3. Update Instructions Structure
- Refine the `YOUR TASK` section to include the conversation detection step.
- Keep the existing `REFERENCE: REAL SOURCING CONVERSATION` as it provides excellent context for tone and phases.

## Verification Plan
- **Manual Verification**: Run the agent with a scenario containing a conversation and verify it's preserved.
- **Manual Verification**: Run the agent with a vague description and verify it generates "human-like" feedback in the `conversationMessages` while keeping the `srData` technically grounded.
