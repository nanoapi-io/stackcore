import { type Kysely, sql } from "kysely";

// deno-lint-ignore no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("email", "varchar(255)", (col) => col.notNull())
    .addColumn("otp", "varchar(6)")
    .addColumn("otp_expires_at", "timestamp")
    .addColumn("last_login_at", "timestamp")
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createTable("organization")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("type", "varchar(255)", (col) => col.notNull())
    .addColumn("access_enabled", "boolean", (col) => col.notNull())
    .addColumn("stripe_customer_id", "varchar(255)")
    .addColumn("monthly_included_credits", "integer", (col) => col.notNull())
    .addColumn("credits_balance", "integer", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createTable("organization_member")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("organization_id", "integer", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) => col.notNull())
    .addColumn("role", "varchar(255)", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createTable("organization_invitation")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn(
      "uuid",
      "varchar(255)",
      (col) => col.defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("organization_id", "integer", (col) => col.notNull())
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createTable("project")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("provider", "varchar(255)")
    .addColumn("provider_id", "varchar(255)")
    .addColumn("organization_id", "integer", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();
}

// deno-lint-ignore no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("user").execute();
  await db.schema.dropTable("organization").execute();
  await db.schema.dropTable("organization_member").execute();
  await db.schema.dropTable("organization_invitation").execute();
  await db.schema.dropTable("project").execute();
}
