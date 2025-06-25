import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface InvitationTable {
  id: Generated<number>;
  uuid: Generated<string>;
  workspace_id: number;
  expires_at: ColumnType<Date>;
  created_at: ColumnType<Date>;
}

export type Invitation = Selectable<InvitationTable>;
export type NewInvitation = Insertable<InvitationTable>;
export type InvitationUpdate = Updateable<InvitationTable>;
