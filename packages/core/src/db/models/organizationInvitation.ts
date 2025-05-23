import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface OrganizationInvitationTable {
  id: Generated<number>;
  uuid: Generated<string>;
  organization_id: number;
  expires_at: ColumnType<Date>;
  created_at: ColumnType<Date>;
}

export type OrganizationInvitation = Selectable<OrganizationInvitationTable>;
export type NewOrganizationInvitation = Insertable<OrganizationInvitationTable>;
export type OrganizationInvitationUpdate = Updateable<
  OrganizationInvitationTable
>;
