---
name: Agent Selection UI
description: Add a dropdown to the playground to allow users to switch between different supervisor agents.
type: project
---

# Design: Agent Selection UI

## Goal
Enhance the Mastra Brain Playground UI to allow users to select which supervisor agent to run (`supervisor-v3` vs `piyush-supervisor`).

## Context
Currently, the playground is hardcoded to use `supervisor-v3`. With the addition of `piyush-supervisor`, users need a way to switch between them for testing and comparison.

## Architecture & State
- **Selected Agent State**: A new state variable `selectedAgent` in the `Home` component.
- **Default Value**: `"supervisor-v3"`.
- **Dynamic Transport**: The `useChat` transport will depend on `selectedAgent` via `useMemo`.

## UI/UX Changes
- **Dropdown Placement**: Directly to the right of the "Run Brain" button in the footer of the "Input Data" card.
- **Component**: A styled native `<select>` component matching the playground's theme (Tailwind classes for border, background, and typography).
- **Options**:
  - `supervisor-v3` -> "Supervisor V3"
  - `piyush-supervisor` -> "Piyush Supervisor"

## Implementation Details
1.  **State Management**:
    - Add `const [selectedAgent, setSelectedAgent] = useState("supervisor-v3");`
2.  **Transport Update**:
    - Update the `transport` useMemo to include `selectedAgent` in the dependency array.
    - Change the API URL to: `${MASTRA_SERVER_URL}/${selectedAgent}`.
3.  **Result Persistence**:
    - Update the `fetch` call in `onFinish` to pass the `selectedAgent` as `agentName`.

## Testing Plan
1.  Verify the dropdown defaults to "Supervisor V3".
2.  Switch to "Piyush Supervisor" and click "Run Brain".
3.  Verify the request goes to the `/piyush-supervisor` endpoint (checking network logs).
4.  Verify the result is saved with `agentName: "piyush-supervisor"`.
