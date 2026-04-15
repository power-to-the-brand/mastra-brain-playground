import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

// ── Scenarios ─────────────────────────────────────────────────────────────────

export const scenarios = pgTable("scenarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  conversationMessages: jsonb("conversation_messages").notNull(),
  srData: jsonb("sr_data").notNull(),
  pastSupplierConversation: jsonb("past_supplier_conversation").notNull(),
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
