import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface ManifestTable {
  id: Generated<number>;
  project_id: number;
  created_at: ColumnType<Date>;
  // metadata used for queries
  branch: string | null;
  commitSha: string | null;
  commitShaDate: ColumnType<Date> | null;
  // manifest
  version: number;
  manifest: ColumnType<object>;
}

export type Manifest = Selectable<ManifestTable>;
export type NewManifest = Insertable<ManifestTable>;
export type ManifestUpdate = Updateable<ManifestTable>;
