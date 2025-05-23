import { db } from "../../db/database.ts";
import { ADMIN_ROLE, MEMBER_ROLE } from "../../db/models/organizationMember.ts";
import { sendInvitationEmail } from "../../email/index.ts";
import settings from "../../settings.ts";

export const notMemberOfOrganizationError = "not_member_of_organization";
export const notAnAdminOfOrganizationError = "not_an_admin_of_organization";
export const organizationNotFoundError = "organization_not_found";
export const organizationNotTeamError = "organization_not_team";
export const invitationNotFoundError = "invitation_not_found";
export const invitationExpiredError = "invitation_expired";
export const alreadyAMemberOfOrganizationError =
  "already_a_member_of_organization";

export class InvitationService {
  /**
   * Create a new invitation for an organization and send email
   */
  public async createInvitation(
    userId: number,
    organizationId: number,
    email: string,
  ): Promise<{ error?: string }> {
    const userMember = await db
      .selectFrom("organization_member")
      .select(["id", "role"])
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfOrganizationError };
    }

    if (userMember.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfOrganizationError };
    }

    const organization = await db
      .selectFrom("organization")
      .select(["id", "name", "isTeam"])
      .where("id", "=", organizationId)
      .where("deactivated", "=", false)
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    if (!organization.isTeam) {
      return { error: organizationNotTeamError };
    }

    // Calculate invitation expiry date based on settings
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.INVITATION.EXPIRY_DAYS);

    // Create the invitation record in the database
    const invitation = await db
      .insertInto("organization_invitation")
      .values({
        organization_id: organizationId,
        expires_at: expiresAt,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send the invitation email to the specified address
    sendInvitationEmail(
      email,
      organization.name,
      invitation.uuid,
    );

    return {};
  }

  /**
   * Claim an invitation and add user to organization
   */
  public async claimInvitation(
    uuid: string,
    userId: number,
  ): Promise<{ error?: string }> {
    // First get the invitation
    const invitation = await db
      .selectFrom("organization_invitation")
      .select([
        "id",
        "uuid",
        "organization_id",
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

    // Check if organization is deactivated
    const organization = await db
      .selectFrom("organization")
      .select(["id", "isTeam"])
      .where("id", "=", invitation.organization_id)
      .where("deactivated", "=", false)
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    if (!organization.isTeam) {
      return { error: organizationNotTeamError };
    }

    // Check if user is already a member
    const member = await db
      .selectFrom("organization_member")
      .select("id")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organization.id)
      .executeTakeFirst();

    if (member) {
      return { error: alreadyAMemberOfOrganizationError };
    }

    // Add user to organization and delete invitation in a transaction
    await db.transaction().execute(async (trx) => {
      // Add user to organization as a member
      await trx
        .insertInto("organization_member")
        .values({
          user_id: userId,
          organization_id: invitation.organization_id,
          role: MEMBER_ROLE,
          created_at: new Date(),
        })
        .execute();

      // Delete the used invitation
      await trx
        .deleteFrom("organization_invitation")
        .where("id", "=", invitation.id)
        .execute();
    });

    return {};
  }
}
