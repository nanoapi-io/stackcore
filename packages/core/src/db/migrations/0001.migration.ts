import { type Kysely, sql } from "kysely";

// deno-lint-ignore no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("user")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("otp", "varchar(6)")
    .addColumn("otp_requested_at", "timestamp")
    .addColumn("otp_attempts", "integer", (col) => col.notNull())
    .addColumn("otp_expires_at", "timestamp")
    .addColumn("last_login_at", "timestamp")
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createTable("token")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn(
      "uuid",
      "varchar(255)",
      (col) => col.defaultTo(sql`gen_random_uuid()`).unique(),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("user_id", "integer", (col) => col.notNull())
    .addColumn("last_used_at", "timestamp")
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "token_user_fk",
      ["user_id"],
      "user",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createTable("workspace")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("isTeam", "boolean", (col) => col.notNull())
    .addColumn("access_enabled", "boolean", (col) => col.notNull())
    .addColumn("stripe_customer_id", "varchar(255)")
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
    .createTable("member")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("workspace_id", "integer", (col) => col.notNull())
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
    .addUniqueConstraint("member_workspace_user_unique", [
      "workspace_id",
      "user_id",
    ])
    .addForeignKeyConstraint(
      "member_workspace_fk",
      ["workspace_id"],
      "workspace",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .addForeignKeyConstraint(
      "member_user_fk",
      ["user_id"],
      "user",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createTable("invitation")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn(
      "uuid",
      "varchar(255)",
      (col) => col.defaultTo(sql`gen_random_uuid()`).unique(),
    )
    .addColumn("workspace_id", "integer", (col) => col.notNull())
    .addColumn("expires_at", "timestamp", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "invitation_workspace_fk",
      ["workspace_id"],
      "workspace",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createTable("project")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("repo_url", "varchar(255)", (col) => col.notNull())
    .addColumn("workspace_id", "integer", (col) => col.notNull())
    .addColumn("max_code_char_per_symbol", "integer", (col) => col.notNull())
    .addColumn("max_code_char_per_file", "integer", (col) => col.notNull())
    .addColumn("max_char_per_symbol", "integer", (col) => col.notNull())
    .addColumn("max_char_per_file", "integer", (col) => col.notNull())
    .addColumn("max_code_line_per_symbol", "integer", (col) => col.notNull())
    .addColumn("max_code_line_per_file", "integer", (col) => col.notNull())
    .addColumn("max_line_per_symbol", "integer", (col) => col.notNull())
    .addColumn("max_line_per_file", "integer", (col) => col.notNull())
    .addColumn("max_dependency_per_symbol", "integer", (col) => col.notNull())
    .addColumn("max_dependency_per_file", "integer", (col) => col.notNull())
    .addColumn("max_dependent_per_symbol", "integer", (col) => col.notNull())
    .addColumn("max_dependent_per_file", "integer", (col) => col.notNull())
    .addColumn(
      "max_cyclomatic_complexity_per_symbol",
      "integer",
      (col) => col.notNull(),
    )
    .addColumn(
      "max_cyclomatic_complexity_per_file",
      "integer",
      (col) => col.notNull(),
    )
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addForeignKeyConstraint(
      "project_workspace_fk",
      ["workspace_id"],
      "workspace",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();

  await db.schema
    .createTable("manifest")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("project_id", "integer", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("branch", "varchar(255)")
    .addColumn("commitSha", "varchar(255)")
    .addColumn("commitShaDate", "timestamp")
    .addColumn("version", "integer", (col) => col.notNull())
    .addColumn("manifest", "varchar(255)", (col) => col.notNull())
    .addForeignKeyConstraint(
      "manifest_project_fk",
      ["project_id"],
      "project",
      ["id"],
      (cb) => cb.onDelete("cascade"),
    )
    .execute();
}

// deno-lint-ignore no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("manifest").execute();
  await db.schema.dropTable("project").execute();
  await db.schema.dropTable("invitation").execute();
  await db.schema.dropTable("member").execute();
  await db.schema.dropTable("workspace").execute();
  await db.schema.dropTable("token").execute();
  await db.schema.dropTable("user").execute();
}
