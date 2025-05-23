import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export const ADMIN_ROLE = "admin";
export const MEMBER_ROLE = "member";
export type OrganizationMemberRole = typeof ADMIN_ROLE | typeof MEMBER_ROLE;

export interface OrganizationMemberTable {
  id: Generated<number>;
  role: OrganizationMemberRole;
  organization_id: number;
  user_id: number;
  created_at: ColumnType<Date>;
}

export type OrganizationMember = Selectable<OrganizationMemberTable>;
export type NewOrganizationMember = Insertable<OrganizationMemberTable>;
export type OrganizationMemberUpdate = Updateable<OrganizationMemberTable>;
