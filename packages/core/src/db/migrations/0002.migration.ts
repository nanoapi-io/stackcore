import type { Kysely } from "kysely";
import {
  downloadJsonFromBucket,
  uploadJsonToBucket,
} from "../../bucketStorage/index.ts";
import type { dependencyManifestTypes } from "@stackcore/shared";

// deno-lint-ignore no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  console.info("starting migration 0002....");

  console.info("getting manifest records....");
  const manifestRecords = await db.selectFrom("manifest").selectAll()
    .execute();

  console.info(`found ${manifestRecords.length} manifest records....`);

  for (const manifestRecord of manifestRecords) {
    console.info(`processing manifest ${manifestRecord.manifest}....`);

    try {
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
    } catch (error) {
      console.error(`error processing manifest ${manifestRecord.manifest}....`);
      console.error(error);
    }
  }

  console.info("migration 0002 completed....");
}

// deno-lint-ignore no-explicit-any
export async function down(_db: Kysely<any>): Promise<void> {
  // Do nothing
}
