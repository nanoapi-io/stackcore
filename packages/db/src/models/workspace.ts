import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface WorkspaceTable {
  id: Generated<number>;
  name: string;
  isTeam: boolean;
  stripe_customer_id: string | null;
  access_enabled: boolean;
  deactivated: boolean;
  created_at: ColumnType<Date>;
}

export type Workspace = Selectable<WorkspaceTable>;
export type NewWorkspace = Insertable<WorkspaceTable>;
export type WorkspaceUpdate = Updateable<WorkspaceTable>;
