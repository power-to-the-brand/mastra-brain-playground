# 🎨 mastra-brain-playground — Developer Onboarding

Welcome to the **mastra-brain-playground** frontend! This is the interactive Next.js application for building, testing, and evaluating AI agents.

---

## Table of Contents

1. [What This Repo Does](#what-this-repo-does)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Running Locally](#running-locally)
5. [Project Structure](#project-structure)
6. [Core Concepts](#core-concepts)
7. [Database & Schema](#database--schema)
8. [S3 Workspace](#s3-workspace)
9. [Common Workflows](#common-workflows)
10. [Gotchas & Conventions](#gotchas--conventions)
11. [Useful Commands](#useful-commands)

---

## What This Repo Does

This module hosts:

- **Scenario Builder** — Create test scenarios with customer conversations, SR data, products, and supplier history
- **Agent CRUD** — Create, edit, and manage agent configurations (model, instructions, tools)
- **Run Management** — Execute agent runs against scenarios and monitor their progress
- **Judge Evaluator** — Evaluate run outputs against rubrics using judge agents
- **S3 Workspace** — Browse and edit skill/reference files stored in S3
- **Mock Tools** — Configure simulated tools for testing agents without real integrations
- **Reference Management** — Manage reference documents used by agents

The playground communicates with the **mastra-brain** backend via HTTP API calls to `http://localhost:4111`.

---

## Prerequisites

| Tool                       | Version | Notes                                                           |
| -------------------------- | ------- | --------------------------------------------------------------- |
| **Node.js**                | ≥ 20    | Next.js 16 requirement                                          |
| **npm**                    | ≥ 11.6  | Package manager                                                 |
| **PostgreSQL**             | 14+     | Shared database with backend                                    |
| **AWS credentials**        | —       | For S3 file management                                          |
| **Google AI API Key**      | —       | For judge evaluation                                            |
| **Running Mastra backend** | —       | The playground needs `mastra-brain` running on `localhost:4111` |

---

## Environment Setup

```bash
cd mastra-brain-playground
```

Create `.env.local`:

```env
# Database (same PostgreSQL instance as backend)
DATABASE_URL=postgresql://user:password@localhost:5432/mastra_brain

# Mastra backend URL
NEXT_PUBLIC_MASTRA_SERVER_URL=http://localhost:4111

# Google AI (for judge evaluation)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key

# S3 (for skill/reference file management)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=mastra-brain-agent-skills
```

Install dependencies:

```bash
npm install
```

---

## Running Locally

> **Prerequisite:** The Mastra backend (`mastra-brain`) must be running on `http://localhost:4111`.

```bash
npm run dev
```

Opens the playground at [http://localhost:3000](http://localhost:3000). It auto-redirects to `/scenarios`.

---

## Project Structure

```
mastra-brain-playground/
├── src/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.tsx                # Root — redirects to /scenarios
│   │   ├── layout.tsx              # Root layout (fonts, TooltipProvider)
│   │   ├── globals.css
│   │   ├── scenarios/              # Scenario builder & list
│   │   ├── scenario-builder/       # Step-by-step scenario creation
│   │   ├── agents/                 # Agent CRUD management
│   │   ├── runs/                   # Run management & monitoring
│   │   ├── judges/                 # Judge configuration
│   │   ├── judge-results/          # Judge evaluation results
│   │   ├── rubrics/                # Rubric management
│   │   ├── references/             # Reference document management
│   │   ├── skills/                 # Skill management
│   │   ├── s3-workspace/           # S3 file browser/editor
│   │   ├── mock-tools/             # Mock tool configuration
│   │   └── api/                    # Next.js API routes
│   │       ├── agents/
│   │       ├── scenarios/
│   │       ├── runs/
│   │       ├── judges/
│   │       ├── rubrics/
│   │       ├── skills/
│   │       ├── references/
│   │       ├── modules/
│   │       ├── s3/
│   │       ├── s3-workspace/
│   │       ├── supervisor-agent-v3/
│   │       ├── supervisor-agent-v3-stream/
│   │       ├── conversation-transformer/
│   │       ├── scenario-generator/
│   │       ├── scenario-results/
│   │       ├── judge-results/
│   │       ├── mock-tools/
│   │       └── tools/
│   ├── components/                 # React components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── assistant-ui/           # AI chat components (@assistant-ui/react)
│   │   ├── agents/                 # Agent-specific components
│   │   ├── judges/                 # Judge-specific components
│   │   ├── runs/                   # Run-specific components
│   │   ├── s3-workspace/           # S3 file browser components
│   │   └── ...                     # Various dialog & editor components
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema (scenarios, agents, runs, skills, judges, etc.)
│   │   └── index.ts               # DB connection & re-exports
│   ├── lib/
│   │   ├── models.ts              # Centralized model configs (Gemini models)
│   │   ├── s3.ts                  # S3 client helpers (upload, get, delete, list)
│   │   ├── judge-evaluator.ts     # Judge evaluation logic
│   │   ├── supplier-conversations.ts  # Supplier conversation normalization
│   │   └── utils.ts               # General utilities
│   └── types/
│       ├── scenario.ts            # Scenario-related types
│       └── tool.ts                # Tool-related types
├── components.json                 # shadcn/ui config
├── next.config.ts
├── package.json
├── tsconfig.json
└── AGENTS.md                       # Frontend-specific agent rules
```

---

## Core Concepts

### Scenario Builder

The primary UI flow. Users create **scenarios** containing:

- Customer conversation messages
- SR (Service Request) data
- Product/quotation data
- Past supplier conversations

These scenarios are then used to run agents against.

### Agent CRUD

Agents can be created, edited, and deleted from the UI. Agent configs (model, instructions, tools) are stored in the `agents` table and dynamically instantiated by the backend factory.

### Runs

A **run** pairs an agent with a scenario. The playground sends the scenario's messages to the Mastra backend's `/chat/dynamic` endpoint and streams the response back. Run state (pending → running → completed/failed) is tracked in the `runs` table.

### Judge Evaluator

After a run completes, you can evaluate it with a **judge** — an agent configured to score the run's output against a **rubric**. Judge configs live in the `judges` table, rubrics in `rubrics`, and results in `judge_results` / `judge_turn_results`.

### S3 Workspace

A file browser/editor for the S3 bucket (`mastra-brain-agent-skills`). Used to manage skill files, reference documents, and other assets that agents load at runtime.

---

## Database & Schema

Schema file: `src/db/schema.ts`

| Table                | Purpose                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `scenarios`          | Test scenarios with conversation messages, SR data, products, supplier conversations |
| `scenario_results`   | Results of scenario runs (final output, agent name)                                  |
| `skills`             | Skill metadata (name, description, version, tags, S3 location)                       |
| `references`         | Reference document metadata (name, description, S3 location)                         |
| `modules`            | Agent modules/categories                                                             |
| `agents`             | Dynamic agent configurations (name, model, instruction, module)                      |
| `agent_subagents`    | Subagent relationships                                                               |
| `agent_skills`       | Skills attached to agents                                                            |
| `agent_tools`        | Tools attached to agents                                                             |
| `runs`               | Agent run records (agent_id, scenario_id, status, metrics, messages)                 |
| `mock_tools`         | Mock tool configurations for testing                                                 |
| `rubrics`            | Evaluation rubrics (dimensions, weights, criteria)                                   |
| `judges`             | Judge agent configurations                                                           |
| `run_judges`         | Judge assignments to runs                                                            |
| `judge_results`      | Overall judge evaluation results                                                     |
| `judge_turn_results` | Per-turn judge evaluation results                                                    |

> **⚠️ Important:** Database schema migrations are **not** run from this repo. The frontend shares the same PostgreSQL database as the backend, but all schema changes are pushed from the `mastra-brain/` repo. If you need to update the schema, do it there.
>
> See [`mastra-brain/ONBOARDING.md`](../mastra-brain/ONBOARDING.md#database--schema) for migration instructions.

---

## S3 Workspace

The S3 Workspace page provides a file browser/editor for the `mastra-brain-agent-skills` bucket. You can:

- Browse folders and files
- Upload new files
- Edit existing files
- Delete files
- Create folders

The S3 client is configured in `src/lib/s3.ts` with the bucket name and region.

---

## Common Workflows

### Creating a Scenario

1. Go to `/scenarios` in the playground
2. Click "New Scenario"
3. Fill in conversation messages, SR data, products, and supplier history
4. Save the scenario

### Running an Agent Against a Scenario

1. Create or select an agent in the Agents page
2. Go to the Runs page
3. Select the agent and scenario
4. Start the run — the playground streams the response from `/chat/dynamic`
5. Monitor the run status and view the output

### Evaluating a Run with a Judge

1. Create a rubric in the Rubrics page (define dimensions, weights, criteria)
2. Create a judge in the Judges page (select model, write instructions, attach rubric)
3. Go to the Run's detail page
4. Assign the judge to the run
5. View the evaluation results in Judge Results

### Managing Skills

1. Go to the Skills page to see skill metadata stored in the DB
2. Go to the S3 Workspace page to browse/edit the actual skill files in S3
3. Skill files are markdown (`SKILL.md`) that agents load at runtime

---

## Gotchas & Conventions

| Topic                     | Rule                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **Git**                   | This is its own Git repo. Run `git` commands from inside `mastra-brain-playground/`.          |
| **Package manager**       | Use `npm` for all package installations.                                                      |
| **Drizzle migrations**    | **Do not run from this repo.** All migrations are pushed from `mastra-brain/`. See backend onboarding for details. |
| **TypeScript**            | Avoid `any` — always create proper interfaces or use existing types.                          |
| **Environment variables** | Never commit `.env.local` files.                                                              |
| **Mastra backend**        | Must be running on `localhost:4111` for the playground to work.                               |
| **Next.js**               | This is Next.js 16 with React 19 — APIs may differ from older versions.                       |
| **shadcn/ui**             | Use `npx shadcn add <component>` to add new UI primitives.                                    |
| **Tailwind**              | Using Tailwind CSS v4 with `@tailwindcss/postcss`.                                            |

---

## Useful Commands

```bash
npm install                # Install dependencies
npm run dev                # Start Next.js dev server (localhost:3000)
npm run build              # Build for production
npm run start              # Start production server
npm run lint                # Run ESLint
npm run test                # Run Vitest tests
npm run test:watch          # Run tests in watch mode
```

### Database

```bash
npx drizzle-kit push        # Apply schema changes (no migration files)
npx drizzle-kit studio      # Open Drizzle Studio (DB browser)
```

### shadcn/ui

```bash
npx shadcn add <component>  # Add a new shadcn/ui component
```

---

## Resources

- **Next.js Docs**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **shadcn/ui Docs**: [https://ui.shadcn.com/](https://ui.shadcn.com/)
- **Tailwind CSS Docs**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Drizzle ORM Docs**: [https://orm.drizzle.team/docs/overview](https://orm.drizzle.team/docs/overview)
- **Mastra Docs**: [https://mastra.ai/docs/](https://mastra.ai/docs/)

---

_See the root `ONBOARDING.md` for the full project overview and backend documentation._
