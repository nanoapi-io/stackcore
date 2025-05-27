import { db } from "../../db/database.ts";
import { ADMIN_ROLE, MEMBER_ROLE } from "../../db/models/member.ts";
import { sendInvitationEmail } from "../../email/index.ts";
import settings from "../../settings.ts";

export const notMemberOfWorkspaceError = "not_member_of_workspace";
export const notAnAdminOfWorkspaceError = "not_an_admin_of_workspace";
export const workspaceNotFoundError = "workspace_not_found";
export const workspaceNotTeamError = "workspace_not_team";
export const invitationNotFoundError = "invitation_not_found";
export const invitationExpiredError = "invitation_expired";
export const alreadyAMemberOfWorkspaceError = "already_a_member_of_workspace";

export class InvitationService {
  /**
   * Create a new invitation for a workspace and send email
   */
  public async createInvitation(
    userId: number,
    workspaceId: number,
    email: string,
  ): Promise<{ error?: string }> {
    const userMember = await db
      .selectFrom("member")
      .select(["id", "role"])
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfWorkspaceError };
    }

    if (userMember.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfWorkspaceError };
    }

    const workspace = await db
      .selectFrom("workspace")
      .select(["id", "name", "isTeam"])
      .where("id", "=", workspaceId)
      .where("deactivated", "=", false)
      .executeTakeFirst();

    if (!workspace) {
      return { error: workspaceNotFoundError };
    }

    if (!workspace.isTeam) {
      return { error: workspaceNotTeamError };
    }

    // Calculate invitation expiry date based on settings
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.INVITATION.EXPIRY_DAYS);

    // Create the invitation record in the database
    const invitation = await db
      .insertInto("invitation")
      .values({
        workspace_id: workspaceId,
        expires_at: expiresAt,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send the invitation email to the specified address
    sendInvitationEmail(
      email,
      workspace.name,
      invitation.uuid,
    );

    return {};
  }

  /**
   * Claim an invitation and add user to workspace
   */
  public async claimInvitation(
    uuid: string,
    userId: number,
  ): Promise<{ error?: string }> {
    // First get the invitation
    const invitation = await db
      .selectFrom("invitation")
      .select([
        "id",
        "uuid",
        "workspace_id",
        "expires_at",
        "created_at",
      ])
      .where("uuid", "=", uuid)
      .executeTakeFirst();

    if (!invitation) {
      return { error: invitationNotFoundError };
    }

    if (invitation.expires_at < new Date()) {
      return { error: invitationExpiredError };
    }

    // Check if workspace is deactivated
    const workspace = await db
      .selectFrom("workspace")
      .select(["id", "isTeam"])
      .where("id", "=", invitation.workspace_id)
      .where("deactivated", "=", false)
      .executeTakeFirst();

    if (!workspace) {
      return { error: workspaceNotFoundError };
    }

    if (!workspace.isTeam) {
      return { error: workspaceNotTeamError };
    }

    // Check if user is already a member
    const member = await db
      .selectFrom("member")
      .select("id")
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirst();

    if (member) {
      return { error: alreadyAMemberOfWorkspaceError };
    }

    // Add user to workspace and delete invitation in a transaction
    await db.transaction().execute(async (trx) => {
      // Add user to workspace as a member
      await trx
        .insertInto("member")
        .values({
          user_id: userId,
          workspace_id: invitation.workspace_id,
          role: MEMBER_ROLE,
          created_at: new Date(),
        })
        .execute();

      // Delete the used invitation
      await trx
        .deleteFrom("invitation")
        .where("id", "=", invitation.id)
        .execute();
    });

    return {};
  }
}
