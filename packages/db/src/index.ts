import type { Database } from "./types.ts";
import { Kysely, PostgresDialect } from "kysely";
import Pool from "pg-pool";
import settings from "@stackcore/settings";

// Export models and types
export * from "./models/user.ts";
export * from "./models/workspace.ts";
export * from "./models/member.ts";
export * from "./models/invitation.ts";
export * from "./models/project.ts";
export * from "./models/manifest.ts";
export * from "./models/token.ts";
export * from "./types.ts";

export let db: Kysely<Database>;

export function initKyselyDb() {
  const pool = new Pool({
    database: settings.DATABASE.DATABASE,
    host: settings.DATABASE.HOST,
    user: settings.DATABASE.USER,
    password: settings.DATABASE.PASSWORD,
    port: settings.DATABASE.PORT,
    max: 10,
  });

  const dialect = new PostgresDialect({ pool });
  db = new Kysely<Database>({
    dialect,
  });
}

export async function destroyKyselyDb() {
  await db.destroy();
}

export { migrateToLatest } from "./migrator.ts";
