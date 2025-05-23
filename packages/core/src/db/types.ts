import type { OrganizationTable } from "./models/organization.ts";
import type { UserTable } from "./models/user.ts";
import type { OrganizationMemberTable } from "./models/organizationMember.ts";
import type { OrganizationInvitationTable } from "./models/organizationInvitation.ts";
import type { ProjectTable } from "./models/project.ts";

export interface Database {
  user: UserTable;
  organization: OrganizationTable;
  organization_member: OrganizationMemberTable;
  organization_invitation: OrganizationInvitationTable;
  project: ProjectTable;
  // dependency_manifest: DependencyManifestTable;
}

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
