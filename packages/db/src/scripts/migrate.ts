import { destroyKyselyDb, initKyselyDb } from "../index.ts";
import { migrateToLatest } from "../migrator.ts";

initKyselyDb();
await migrateToLatest();
await destroyKyselyDb();
