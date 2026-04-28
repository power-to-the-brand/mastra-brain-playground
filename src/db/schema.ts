import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
  primaryKey,
  numeric,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Scenarios ─────────────────────────────────────────────────────────────────

export const scenarios = pgTable("scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  conversationMessages: jsonb("conversation_messages"),
  srData: jsonb("sr_data"),
  products: jsonb("products"),
  pastSupplierConversation: jsonb("past_supplier_conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Scenario = typeof scenarios.$inferSelect;
export type NewScenario = typeof scenarios.$inferInsert;

// ── Scenario Results ─────────────────────────────────────────────────────────

export const scenarioResults = pgTable("scenario_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  scenarioId: uuid("scenario_id").references(() => scenarios.id, {
    onDelete: "cascade",
  }),
  finalOutput: text("final_output").notNull(),
  agentName: varchar("agent_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ScenarioResult = typeof scenarioResults.$inferSelect;
export type NewScenarioResult = typeof scenarioResults.$inferInsert;

// ── Skills ───────────────────────────────────────────────────────────────────

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).notNull().default("1.0.0"),
  tags: jsonb("tags").$type<string[]>().default([]),
  s3Location: text("s3_location").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

// ── References ────────────────────────────────────────────────────────────────

export const references = pgTable("references", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  s3Location: text("s3_location").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Reference = typeof references.$inferSelect;
export type NewReference = typeof references.$inferInsert;

// ── Modules ────────────────────────────────────────────────────────────────────

export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

// ── Agents ───────────────────────────────────────────────────────────────────

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  model: varchar("model", { length: 255 }).notNull(),
  instruction: text("instruction").notNull(),
  moduleId: uuid("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;

// ── Runs ─────────────────────────────────────────────────────────────────────

export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  scenarioId: uuid("scenario_id")
    .references(() => scenarios.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  openingMessageOverride: text("opening_message_override"),
  metrics: jsonb("metrics").$type<{
    tokens?: number;
    duration?: number;
    cost?: number;
  }>(),
  verdict: varchar("verdict", { length: 50 }),
  output: text("output"),
  messages: jsonb("messages")
    .$type<
      Array<{
        role: "user" | "assistant" | "system";
        content: string;
        timestamp?: string;
      }>
    >()
    .default([]),
  trace: jsonb("trace")
    .$type<
      Array<{
        type: "subagent" | "skill" | "tool";
        name: string;
        input: any;
        output: any;
        timestamp: string;
      }>
    >()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export const runsRelations = relations(runs, ({ many, one }) => ({
  agent: one(agents, {
    fields: [runs.agentId],
    references: [agents.id],
  }),
  scenario: one(scenarios, {
    fields: [runs.scenarioId],
    references: [scenarios.id],
  }),
  judgeAssignments: many(runJudges),
  judgeResults: many(judgeResults),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  subagents: many(agentSubagents, { relationName: "agent_to_subagents" }),
  skills: many(agentSkills),
  tools: many(agentTools),
}));

export const agentSubagents = pgTable(
  "agent_subagents",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    subagentId: uuid("subagent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.subagentId] }),
  }),
);

export const agentSubagentsRelations = relations(agentSubagents, ({ one }) => ({
  agent: one(agents, {
    fields: [agentSubagents.agentId],
    references: [agents.id],
    relationName: "agent_to_subagents",
  }),
  subagent: one(agents, {
    fields: [agentSubagents.subagentId],
    references: [agents.id],
    relationName: "subagent_to_agent",
  }),
}));

export const agentSkills = pgTable(
  "agent_skills",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    skillId: uuid("skill_id")
      .references(() => skills.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.skillId] }),
  }),
);

export const agentSkillsRelations = relations(agentSkills, ({ one }) => ({
  agent: one(agents, {
    fields: [agentSkills.agentId],
    references: [agents.id],
  }),
  skill: one(skills, {
    fields: [agentSkills.skillId],
    references: [skills.id],
  }),
}));

// ── Mock Tools ───────────────────────────────────────────────────────────────

export const mockTools = pgTable("mock_tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  toolId: varchar("tool_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inputSchema: jsonb("input_schema").notNull().default([]),
  mockMode: varchar("mock_mode", { length: 20 }).notNull(),
  mockFixedResponse: jsonb("mock_fixed_response"),
  mockSimulationPrompt: text("mock_simulation_prompt"),
  mockSimulationModel: varchar("mock_simulation_model", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MockTool = typeof mockTools.$inferSelect;
export type NewMockTool = typeof mockTools.$inferInsert;

export const agentTools = pgTable(
  "agent_tools",
  {
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    toolId: varchar("tool_id", { length: 255 }).notNull(),
    toolType: varchar("tool_type", { length: 20 }).notNull().default("mastra"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.agentId, t.toolId, t.toolType] }),
  }),
);

export const agentToolsRelations = relations(agentTools, ({ one }) => ({
  agent: one(agents, {
    fields: [agentTools.agentId],
    references: [agents.id],
  }),
}));

// ── Rubrics ──────────────────────────────────────────────────────────────────

export const rubrics = pgTable("rubrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dimensions: jsonb("dimensions")
    .$type<
      Array<{
        name: string;
        description: string;
        weight: number;
        scoringCriteria: string;
        scale: { min: number; max: number };
      }>
    >()
    .notNull()
    .default([]),
  passingThreshold: jsonb("passing_threshold"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Rubric = typeof rubrics.$inferSelect;
export type NewRubric = typeof rubrics.$inferInsert;

export const rubricsRelations = relations(rubrics, ({ many }) => ({
  judges: many(judges),
}));

// ── Judges ───────────────────────────────────────────────────────────────────

export const judgeModes = ["run_level", "turn_level", "both"] as const;
export type JudgeMode = (typeof judgeModes)[number];

export const judges = pgTable("judges", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  model: varchar("model", { length: 255 }).notNull(),
  systemPrompt: text("system_prompt"),
  temperature: numeric("temperature", { precision: 3, scale: 2 }).default("0.7"),
  rubricId: uuid("rubric_id")
    .references(() => rubrics.id, { onDelete: "restrict" })
    .notNull(),
  mode: varchar("mode", { length: 20 })
    .notNull()
    .default("run_level")
    .$type<JudgeMode>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Judge = typeof judges.$inferSelect;
export type NewJudge = typeof judges.$inferInsert;

export const judgesRelations = relations(judges, ({ one, many }) => ({
  rubric: one(rubrics, {
    fields: [judges.rubricId],
    references: [rubrics.id],
  }),
  runAssignments: many(runJudges),
  judgeResults: many(judgeResults),
}));

// ── Run Judges (Assignment) ──────────────────────────────────────────────────

export const runJudges = pgTable("run_judges", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  judgeId: uuid("judge_id")
    .references(() => judges.id, { onDelete: "cascade" })
    .notNull(),
  autoEvaluate: boolean("auto_evaluate").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RunJudge = typeof runJudges.$inferSelect;
export type NewRunJudge = typeof runJudges.$inferInsert;

// ── Judge Results ───────────────────────────────────────────────────────────

export const judgeResults = pgTable("judge_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runJudgeId: uuid("run_judge_id")
    .references(() => runJudges.id, { onDelete: "cascade" })
    .notNull(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  judgeId: uuid("judge_id")
    .references(() => judges.id, { onDelete: "cascade" })
    .notNull(),
  mode: varchar("mode", { length: 20 }).notNull(),
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
  verdict: varchar("verdict", { length: 20 }),
  dimensionScores: jsonb("dimension_scores")
    .$type<
      Array<{
        name: string;
        score: number;
        weight: number;
        weightedScore: number;
        reasoning: string;
      }>
    >()
    .notNull()
    .default([]),
  summary: text("summary"),
  model: varchar("model", { length: 255 }),
  tokensUsed: jsonb("tokens_used").$type<{
    input: number;
    output: number;
    total: number;
  }>(),
  evaluatedAt: timestamp("evaluated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type JudgeResult = typeof judgeResults.$inferSelect;
export type NewJudgeResult = typeof judgeResults.$inferInsert;

// ── Judge Turn Results ───────────────────────────────────────────────────────

export const judgeTurnResults = pgTable("judge_turn_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  judgeResultId: uuid("judge_result_id")
    .references(() => judgeResults.id, { onDelete: "cascade" })
    .notNull(),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" })
    .notNull(),
  turnIndex: integer("turn_index").notNull(),
  scores: jsonb("scores")
    .$type<
      Array<{
        name: string;
        score: number;
        weight: number;
        weightedScore: number;
        reasoning: string;
      }>
    >()
    .notNull()
    .default([]),
  overallTurnScore: numeric("overall_turn_score", { precision: 5, scale: 2 }),
  turnVerdict: varchar("turn_verdict", { length: 20 }),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type JudgeTurnResult = typeof judgeTurnResults.$inferSelect;
export type NewJudgeTurnResult = typeof judgeTurnResults.$inferInsert;

export const runJudgesRelations = relations(runJudges, ({ one, many }) => ({
  run: one(runs, {
    fields: [runJudges.runId],
    references: [runs.id],
  }),
  judge: one(judges, {
    fields: [runJudges.judgeId],
    references: [judges.id],
  }),
  results: many(judgeResults),
}));

export const judgeResultsRelations = relations(judgeResults, ({ one, many }) => ({
  runJudge: one(runJudges, {
    fields: [judgeResults.runJudgeId],
    references: [runJudges.id],
  }),
  run: one(runs, {
    fields: [judgeResults.runId],
    references: [runs.id],
  }),
  judge: one(judges, {
    fields: [judgeResults.judgeId],
    references: [judges.id],
  }),
  turnResults: many(judgeTurnResults),
}));

export const judgeTurnResultsRelations = relations(judgeTurnResults, ({ one }) => ({
  judgeResult: one(judgeResults, {
    fields: [judgeTurnResults.judgeResultId],
    references: [judgeResults.id],
  }),
  run: one(runs, {
    fields: [judgeTurnResults.runId],
    references: [runs.id],
  }),
}));
