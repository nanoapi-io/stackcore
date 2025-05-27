import { db } from "../db/database.ts";

export async function resetTables() {
  await db.deleteFrom("project").execute();
  await db.deleteFrom("invitation").execute();
  await db.deleteFrom("member").execute();
  await db.deleteFrom("workspace").execute();
  await db.deleteFrom("user").execute();
}
