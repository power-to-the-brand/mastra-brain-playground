import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

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
