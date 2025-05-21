import { db } from "../../db/database.ts";
import { ADMIN_ROLE, type MEMBER_ROLE } from "../../db/types.ts";
import { sendInvitationEmail } from "../../email/index.ts";
import settings from "../../settings.ts";
import { StripeService } from "../../stripe/index.ts";

export const organizationAlreadyExistsErrorCode = "organization_already_exists";
export const organizationNotFoundError = "organization_not_found";
export const notAMemberOfOrganizationError = "not_a_member_of_organization";
export const notAnAdminOfOrganizationError = "not_an_admin_of_organization";
export const cannotDeletePersonalOrganizationError =
  "cannot_delete_personal_organization";
export const alreadyAMemberOfOrganizationError =
  "already_a_member_of_organization";
export const cannotCreateInvitationForPersonalOrganizationError =
  "cannot_create_invitation_for_personal_organization";
export const invitationNotFoundError = "invitation_not_found";
export const memberNotFoundError = "member_not_found";
export const cannotRemoveSelfFromOrganizationError =
  "cannot_remove_self_from_organization";
export const cannotUpdateSelfFromOrganizationError =
  "cannot_update_self_from_organization";

export class OrganizationService {
  /**
   * Create a new organization
   */
  public async createTeamOrganization(
    name: string,
    userId: number,
  ): Promise<{
    error?: typeof organizationAlreadyExistsErrorCode;
  }> {
    // First check if user is a member of any organization with this name
    const existingOrg = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .select("organization.id")
      .where("organization_member.user_id", "=", userId)
      .where("organization.name", "=", name)
      .where("organization.isTeam", "=", true)
      .executeTakeFirst();

    if (existingOrg) {
      return { error: organizationAlreadyExistsErrorCode };
    }

    // Create organization and member in a transaction
    await db.transaction().execute(async (trx) => {
      // Create the organization
      const org = await trx
        .insertInto("organization")
        .values({
          name,
          isTeam: true,
          stripe_customer_id: null,
          access_enabled: false,
          created_at: new Date(),
          deactivated: false,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Add the user as an admin
      await trx
        .insertInto("organization_member")
        .values({
          role: ADMIN_ROLE,
          organization_id: org.id,
          user_id: userId,
          created_at: new Date(),
        })
        .execute();

      // Create Stripe customer
      const stripeService = new StripeService();
      const customer = await stripeService.createCustomer(org);

      // Update organization with Stripe customer ID
      const updatedOrg = await trx
        .updateTable("organization")
        .set({ stripe_customer_id: customer.id })
        .where("id", "=", org.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      await stripeService.createSubscription(
        updatedOrg,
        "BASIC",
        "MONTHLY",
      );

      return org;
    });

    return {};
  }

  /**
   * Get all organizations for a user
   */
  public async getOrganizations(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<{
    results: {
      id: number;
      name: string;
      isTeam: boolean;
      role: typeof ADMIN_ROLE | typeof MEMBER_ROLE;
    }[];
    total: number;
  }> {
    // Get total count of organizations
    const totalResult = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("organization_member.user_id", "=", userId)
      .where("organization.deactivated", "=", false)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("organization.name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .executeTakeFirst();

    const total = Number(totalResult?.total) || 0;

    // Get paginated organizations
    const organizations = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select([
        "organization.id",
        "organization.name",
        "organization.isTeam",
        "organization_member.role",
      ])
      .where("organization_member.user_id", "=", userId)
      .where("organization.deactivated", "=", false)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("organization.name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .orderBy("organization.name", "asc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    return {
      results: organizations,
      total,
    };
  }

  /**
   * Update an organization
   */
  public async updateOrganization(
    userId: number,
    organizationId: number,
    name: string,
  ): Promise<{ error?: string }> {
    // First check if user is a member of the organization and organization
    const memberCheck = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select(["organization_member.role"])
      .where("organization_member.user_id", "=", userId)
      .where("organization_member.organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!memberCheck) {
      return { error: organizationNotFoundError };
    }

    if (memberCheck.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfOrganizationError };
    }

    // Update organization name
    await db
      .updateTable("organization")
      .set({ name })
      .where("id", "=", organizationId)
      .execute();

    return {};
  }

  /**
   * Delete an organization
   */
  public async deleteOrganization(
    userId: number,
    organizationId: number,
  ): Promise<
    {
      error?:
        | typeof organizationNotFoundError
        | typeof cannotDeletePersonalOrganizationError
        | typeof notAnAdminOfOrganizationError;
    }
  > {
    // First check if user is a member of the organization
    const memberCheck = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select(["organization_member.role"])
      .where("organization_member.user_id", "=", userId)
      .where("organization_member.organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!memberCheck) {
      return { error: organizationNotFoundError };
    }

    if (memberCheck.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfOrganizationError };
    }

    // Check if it's a personal organization
    const orgCheck = await db
      .selectFrom("organization")
      .select("isTeam")
      .where("id", "=", organizationId)
      .executeTakeFirst();

    if (!orgCheck?.isTeam) {
      return { error: cannotDeletePersonalOrganizationError };
    }

    // Delete organization members and organization in a transaction
    await db.transaction().execute(async (trx) => {
      // First delete all organization members
      await trx
        .deleteFrom("organization_member")
        .where("organization_id", "=", organizationId)
        .execute();

      // Then delete the organization
      await trx
        .deleteFrom("organization")
        .where("id", "=", organizationId)
        .execute();
    });

    return {};
  }

  /**
   * Create a new invitation for an organization and send email
   */
  public async createInvitation(
    userId: number,
    organizationId: number,
    email: string,
  ): Promise<{ error?: string }> {
    // First check if user is a member of the organization
    const orgCheck = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .select([
        "organization.name",
        "organization.isTeam",
        "organization_member.role as user_role",
      ])
      .where("organization_member.user_id", "=", userId)
      .where("organization_member.organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!orgCheck) {
      return { error: organizationNotFoundError };
    }

    if (!orgCheck?.isTeam) {
      return { error: cannotCreateInvitationForPersonalOrganizationError };
    }

    if (orgCheck.user_role !== ADMIN_ROLE) {
      return { error: notAnAdminOfOrganizationError };
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
      orgCheck.name,
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

    // Check if organization is deactivated
    const orgCheck = await db
      .selectFrom("organization")
      .select("deactivated")
      .where("id", "=", invitation.organization_id)
      .executeTakeFirst();

    if (orgCheck?.deactivated) {
      return { error: organizationNotFoundError };
    }

    // Check if user is already a member
    const existingMember = await db
      .selectFrom("organization_member")
      .select("id")
      .where("user_id", "=", userId)
      .where("organization_id", "=", invitation.organization_id)
      .executeTakeFirst();

    if (existingMember) {
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
          role: "member",
          created_at: new Date(),
        })
        .execute();

      // Delete the used invitation
      await trx
        .deleteFrom("organization_invitation")
        .where("uuid", "=", uuid)
        .execute();
    });

    return {};
  }

  /**
   * Get all members of an organization
   */
  public async getMembers(
    userId: number,
    organizationId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<
    {
      results: {
        id: number;
        user_id: number;
        email: string;
        role: typeof ADMIN_ROLE | typeof MEMBER_ROLE;
      }[];
      total: number;
    } | {
      error: string;
    }
  > {
    // First check if user is a member of the organization
    const organizationCheck = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!organizationCheck) {
      return { error: organizationNotFoundError };
    }

    // Get total count of members
    const totalResult = await db
      .selectFrom("organization_member")
      .innerJoin("user", "user.id", "organization_member.user_id")
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("organization_member.organization_id", "=", organizationId)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("user.email", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .executeTakeFirst();

    const total = Number(totalResult?.total) || 0;

    // Get paginated members
    const members = await db
      .selectFrom("organization_member")
      .innerJoin("user", "user.id", "organization_member.user_id")
      .select([
        "organization_member.id",
        "user.id as user_id",
        "user.email",
        "organization_member.role",
      ])
      .where("organization_member.organization_id", "=", organizationId)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("user.email", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .orderBy("organization_member.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    return {
      results: members,
      total,
    };
  }

  /**
   * Update a member's role in an organization
   */
  public async updateMemberRole(
    userId: number,
    organizationId: number,
    memberId: number,
    role: typeof ADMIN_ROLE | typeof MEMBER_ROLE,
  ): Promise<{ error?: string }> {
    // First check if user is an admin of the organization
    const adminCheck = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select("role")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!adminCheck) {
      return { error: organizationNotFoundError };
    }

    if (adminCheck.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfOrganizationError };
    }

    // Check if member exists and get their user ID
    const memberCheck = await db
      .selectFrom("organization_member")
      .select("user_id")
      .where("id", "=", memberId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!memberCheck) {
      return { error: memberNotFoundError };
    }

    if (memberCheck.user_id === userId) {
      return { error: cannotUpdateSelfFromOrganizationError };
    }

    // Update member role
    await db
      .updateTable("organization_member")
      .set({ role })
      .where("id", "=", memberId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirstOrThrow();

    return {};
  }

  /**
   * Remove a member from an organization
   */
  public async removeMemberFromOrganization(
    userId: number,
    organizationId: number,
    memberId: number,
  ): Promise<{ error?: string }> {
    // First check if user is an admin of the organization
    const adminCheck = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select("role")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!adminCheck) {
      return { error: organizationNotFoundError };
    }

    if (adminCheck.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfOrganizationError };
    }

    // Check if member exists and get their user ID
    const memberCheck = await db
      .selectFrom("organization_member")
      .select("user_id")
      .where("id", "=", memberId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!memberCheck) {
      return { error: memberNotFoundError };
    }

    if (memberCheck.user_id === userId) {
      return { error: cannotRemoveSelfFromOrganizationError };
    }

    // Remove member from organization
    await db
      .deleteFrom("organization_member")
      .where("id", "=", memberId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirstOrThrow();

    return {};
  }
}
