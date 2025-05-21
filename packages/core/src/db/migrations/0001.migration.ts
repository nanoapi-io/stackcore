import { type Kysely, sql } from "kysely";

// deno-lint-ignore no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("otp", "varchar(6)")
    .addColumn("otp_expires_at", "timestamp")
    .addColumn("last_login_at", "timestamp")
    .addColumn(
      "deactivated",
      "boolean",
      (col) => col.notNull().defaultTo(false),
    )
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
    .addColumn("isTeam", "boolean", (col) => col.notNull())
    .addColumn("access_enabled", "boolean", (col) => col.notNull())
    .addColumn("stripe_customer_id", "varchar(255)")
    .addColumn(
      "plan",
      "varchar(255)",
      (col) => col.check(sql`plan IN ('BASIC', 'PRO', 'PREMIUM', 'CUSTOM')`),
    )
    .addColumn(
      "deactivated",
      "boolean",
      (col) => col.notNull().defaultTo(false),
    )
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
    .addColumn(
      "role",
      "varchar(255)",
      (col) => col.notNull().check(sql`role IN ('admin', 'member')`),
    )
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addUniqueConstraint("organization_member_org_user_unique", [
      "organization_id",
      "user_id",
    ])
    .addForeignKeyConstraint(
      "organization_member_org_fk",
      ["organization_id"],
      "organization",
      ["id"],
    )
    .addForeignKeyConstraint(
      "organization_member_user_fk",
      ["user_id"],
      "user",
      ["id"],
    )
    .execute();

  await db.schema
    .createTable("organization_invitation")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn(
      "uuid",
      "varchar(255)",
      (col) => col.defaultTo(sql`gen_random_uuid()`).unique(),
    )
    .addColumn("organization_id", "integer", (col) => col.notNull())
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "organization_invitation_org_fk",
      ["organization_id"],
      "organization",
      ["id"],
    )
    .execute();

  await db.schema
    .createTable("project")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn(
      "provider",
      "varchar(255)",
      (col) => col.check(sql`provider IN ('github', 'gitlab')`),
    )
    .addColumn("provider_id", "varchar(255)")
    .addColumn("organization_id", "integer", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "project_org_fk",
      ["organization_id"],
      "organization",
      ["id"],
    )
    .execute();
}

// deno-lint-ignore no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("project").execute();
  await db.schema.dropTable("organization_invitation").execute();
  await db.schema.dropTable("organization_member").execute();
  await db.schema.dropTable("organization").execute();
  await db.schema.dropTable("user").execute();
}
