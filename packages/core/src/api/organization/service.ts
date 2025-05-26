import { db } from "../../db/database.ts";
import { shouldHaveAccess } from "../../db/models/organization.ts";
import {
  ADMIN_ROLE,
  type OrganizationMemberRole,
} from "../../db/models/organizationMember.ts";
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
  ): Promise<
    {
      id: number;
    } | {
      error: typeof organizationAlreadyExistsErrorCode;
    }
  > {
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
    const orgId = await db.transaction().execute(async (trx) => {
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
      const customer = await stripeService.createCustomer(
        org.id,
        org.name,
      );
      const subscription = await stripeService.createSubscription(
        customer.id,
        "BASIC",
        "MONTHLY",
      );

      const accessEnabled = shouldHaveAccess(subscription.status);

      // Update organization with Stripe customer ID
      await trx
        .updateTable("organization")
        .set({
          stripe_customer_id: customer.id,
          access_enabled: accessEnabled,
        })
        .where("id", "=", org.id)
        .execute();

      return org.id;
    });

    return {
      id: orgId,
    };
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
      role: OrganizationMemberRole | null;
      access_enabled: boolean;
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
        "organization.access_enabled",
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
    const org = await db
      .selectFrom("organization")
      .where("id", "=", organizationId)
      .selectAll()
      .executeTakeFirstOrThrow();

    if (!org.isTeam) {
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

      // Cancel Stripe subscription
      if (org.stripe_customer_id) {
        const stripeService = new StripeService();
        await stripeService.cancelSubscription(org.stripe_customer_id);
      }
    });

    return {};
  }
}
