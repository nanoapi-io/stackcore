import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export const ADMIN_ROLE = "admin";
export const MEMBER_ROLE = "member";
export type MemberRole = typeof ADMIN_ROLE | typeof MEMBER_ROLE;

export interface MemberTable {
  id: Generated<number>;
  role: MemberRole;
  workspace_id: number;
  user_id: number;
  created_at: ColumnType<Date>;
}

export type Member = Selectable<MemberTable>;
export type NewMember = Insertable<MemberTable>;
export type MemberUpdate = Updateable<MemberTable>;
