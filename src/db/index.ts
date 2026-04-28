import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = drizzle(DATABASE_URL, { schema });

export { db };

// Export types and tables
export {
  scenarios,
  scenarioResults,
  skills,
  modules,
  agents,
  agentSubagents,
  agentSkills,
  agentTools,
  runs,
  references,
  mockTools,
  rubrics,
  judges,
} from "./schema";
export type {
  Scenario,
  NewScenario,
  ScenarioResult,
  NewScenarioResult,
  Skill,
  NewSkill,
  Module,
  NewModule,
  Agent,
  NewAgent,
  Run,
  NewRun,
  Reference,
  NewReference,
  MockTool,
  NewMockTool,
  Rubric,
  NewRubric,
  Judge,
  NewJudge,
} from "./schema";
