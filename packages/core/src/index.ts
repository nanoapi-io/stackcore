import { initKyselyDb } from "./db/database.ts";
import api from "./api/index.ts";
import { migrateToLatest } from "./db/migrator.ts";

initKyselyDb();

console.info("Migrating database to latest version...");
await migrateToLatest();
console.info("Database migrated to latest version");

console.info("Starting server...");
const port = 4000;
api.listen({ port });
console.info(`Server is running on port http://localhost:${port}`);
