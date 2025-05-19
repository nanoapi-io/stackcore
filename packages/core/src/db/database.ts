import type { Database } from "./types.ts";
import { Kysely, PostgresDialect } from "kysely";
import Pool from "pg-pool";
import settings from "../settings.ts";

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
