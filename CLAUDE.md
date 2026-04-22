@AGENTS.md

# Package Manager

Use `pnpm` for all package installations in this repo (not npm).

# Design & Layout Standards

- **Centered Max-Width**: Use `mx-auto` combined with responsive `max-w-*` containers (e.g., `7xl`, `6xl`, `4xl`) for all main content areas.
- **Why**: Prevents UI from feeling "stretched" or "left-heavy" on ultra-wide monitors while maintaining optimal line length for readability.
- **Playground Workspace**: For interactive playgrounds, prefer wider containers (like `max-w-7xl`) and allow input cards to fill that width to maximize the usable workspace.

# Typescript Rules

- Avoid using `any` as type. Always create interface or use existing type

# Drizzle ORM

- Do NOT run `drizzle-kit generate` or `drizzle-kit migrate` in this directory.
- Use `drizzle-kit push` within `mastra-brain/` to apply schema changes.
