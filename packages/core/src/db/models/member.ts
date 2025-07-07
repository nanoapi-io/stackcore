import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";
import type { memberTypes } from "@stackcore/shared";

export interface MemberTable {
  id: Generated<number>;
  role: memberTypes.MemberRole;
  workspace_id: number;
  user_id: number;
  created_at: ColumnType<Date>;
}

export type Member = Selectable<MemberTable>;
export type NewMember = Insertable<MemberTable>;
export type MemberUpdate = Updateable<MemberTable>;
