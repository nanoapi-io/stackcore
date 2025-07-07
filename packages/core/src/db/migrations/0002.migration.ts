import { type Kysely, sql } from "kysely";
import {
  downloadJsonFromBucket,
  uploadJsonToBucket,
} from "../../bucketStorage/index.ts";
import type { dependencyManifestTypes } from "@stackcore/shared";

// deno-lint-ignore no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  // Create vector extension
  await db.executeQuery(sql`CREATE EXTENSION vector;`.compile(db));

  const manifestRecords = await db.selectFrom("manifest").selectAll()
    .execute();

  for (const manifestRecord of manifestRecords) {
    const manifestJson = await downloadJsonFromBucket(
      manifestRecord.manifest,
    ) as dependencyManifestTypes.DependencyManifest;

    for (
      const fileManifestKey of Object.keys(manifestJson)
    ) {
      for (
        const symbolManifestKey of Object.keys(
          manifestJson[fileManifestKey].symbols,
        )
      ) {
        // set empty description to match new schema
        manifestJson[fileManifestKey].symbols[symbolManifestKey].description =
          "";
      }
    }

    await uploadJsonToBucket(manifestJson, manifestRecord.manifest);
  }
}

// deno-lint-ignore no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
  // Drop vector extension
  await db.executeQuery(sql`DROP EXTENSION vector;`.compile(db));
}
