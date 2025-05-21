import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface Database {
  user: UserTable;
  organization: OrganizationTable;
  organization_member: OrganizationMemberTable;
  organization_invitation: OrganizationInvitationTable;
  project: ProjectTable;
  // dependency_manifest: DependencyManifestTable;
}

export interface UserTable {
  id: Generated<number>;
  email: string;
  otp: string | null;
  otp_expires_at: ColumnType<Date | null>;
  last_login_at: ColumnType<Date | null>;
  deactivated: boolean;
  created_at: ColumnType<Date>;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;

export const BASIC_PLAN = "BASIC";
export const PRO_PLAN = "PRO";
export const PREMIUM_PLAN = "PREMIUM";
export const CUSTOM_PLAN = "CUSTOM";

export interface OrganizationTable {
  id: Generated<number>;
  name: string;
  isTeam: boolean;
  access_enabled: boolean;
  stripe_customer_id: string | null;
  plan:
    | typeof BASIC_PLAN
    | typeof PRO_PLAN
    | typeof PREMIUM_PLAN
    | typeof CUSTOM_PLAN
    | null;
  deactivated: boolean;
  created_at: ColumnType<Date>;
}

export type Organization = Selectable<OrganizationTable>;
export type NewOrganization = Insertable<OrganizationTable>;
export type OrganizationUpdate = Updateable<OrganizationTable>;

export const ADMIN_ROLE = "admin";
export const MEMBER_ROLE = "member";

export interface OrganizationMemberTable {
  id: Generated<number>;
  role: typeof ADMIN_ROLE | typeof MEMBER_ROLE;
  organization_id: number;
  user_id: number;
  created_at: ColumnType<Date>;
}

export type OrganizationMember = Selectable<OrganizationMemberTable>;
export type NewOrganizationMember = Insertable<OrganizationMemberTable>;
export type OrganizationMemberUpdate = Updateable<OrganizationMemberTable>;

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

// export interface DependencyManifestTable {
//   id: Generated<number>;
//   name: string;
//   commit_sha: string | null;
//   branch: string | null;
//   repository_id: number | null;
//   version: string;
//   content: ColumnType<object>;
//   created_at: ColumnType<Date>;
// }

// export type DependencyManifest = Selectable<DependencyManifestTable>;
// export type NewDependencyManifest = Insertable<DependencyManifestTable>;
// export type DependencyManifestUpdate = Updateable<DependencyManifestTable>;
