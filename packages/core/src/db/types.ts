import type { WorkspaceTable } from "./models/workspace.ts";
import type { UserTable } from "./models/user.ts";
import type { MemberTable } from "./models/member.ts";
import type { InvitationTable } from "./models/invitation.ts";
import type { ProjectTable } from "./models/project.ts";

export interface Database {
  user: UserTable;
  workspace: WorkspaceTable;
  member: MemberTable;
  invitation: InvitationTable;
  project: ProjectTable;
}
