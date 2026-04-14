import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const db = drizzle(DATABASE_URL, { schema });

export { db };

// Export types and tables
export { scenarios } from "./schema";
export type { Scenario, NewScenario } from "./schema";
