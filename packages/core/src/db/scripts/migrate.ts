import { destroyKyselyDb, initKyselyDb } from "../database.ts";
import { migrateToLatest } from "../migrator.ts";

initKyselyDb();
await migrateToLatest();
await destroyKyselyDb();
