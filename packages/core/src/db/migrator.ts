import * as path from "@std/path";
import { promises } from "node:fs";
import { FileMigrationProvider, Migrator } from "kysely";
import { db, destroyKyselyDb, initKyselyDb } from "./database.ts";

async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs: promises,
      path,
      // This needs to be an absolute path.
      migrationFolder: path.join(import.meta.dirname as string, "migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.info(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    Deno.exit(1);
  }

  await db.destroy();
}

initKyselyDb();
await migrateToLatest();
await destroyKyselyDb();
