import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
  primaryKey,
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
