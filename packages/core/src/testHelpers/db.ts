import { db } from "../db/database.ts";

export async function resetTables() {
  await db.deleteFrom("project").execute();
  await db.deleteFrom("organization_invitation").execute();
  await db.deleteFrom("organization_member").execute();
  await db.deleteFrom("organization").execute();
  await db.deleteFrom("user").execute();
}
