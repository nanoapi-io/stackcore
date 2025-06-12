import { initKyselyDb } from "./db/database.ts";
import api from "./api/index.ts";
import { migrateToLatest } from "./db/migrator.ts";
import * as Sentry from "@sentry/deno";
import settings from "./settings.ts";

if (settings.SENTRY.DSN) {
  console.info("Initializing Sentry...");
  Sentry.init({
    dsn: settings.SENTRY.DSN,
  });
  console.info("Sentry initialized");
} else {
  console.error("Skipping Sentry initialization, no DSN provided");
}

initKyselyDb();

console.info("Migrating database to latest version...");
await migrateToLatest();
console.info("Database migrated to latest version");

console.info("Starting server...");
const port = 4000;
api.listen({ port });
console.info(`Server is running on port http://localhost:${port}`);
