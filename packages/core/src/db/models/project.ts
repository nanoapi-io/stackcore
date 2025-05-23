import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface ProjectTable {
  id: Generated<number>;
  name: string;
  provider: "github" | "gitlab" | null;
  provider_id: string | null;
  organization_id: number;
  created_at: ColumnType<Date>;
}

export type Project = Selectable<ProjectTable>;
export type NewProject = Insertable<ProjectTable>;
export type ProjectUpdate = Updateable<ProjectTable>;
