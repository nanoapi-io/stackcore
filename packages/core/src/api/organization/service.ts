import { db } from "../../db/database.ts";
import type { Organization } from "../../db/types.ts";
import { sendInvitationEmail } from "../../email/index.ts";
import settings from "../../settings.ts";
import { StripeService } from "../../stripe/index.ts";

export const organizationAlreadyExistsErrorCode = "organization_already_exists";
export const organizationNotFoundError = "organization_not_found";
export const notAMemberOfOrganizationError = "not_a_member_of_organization";
export const notAnAdminOfOrganizationError = "not_an_admin_of_organization";
export const memberNotFoundError = "member_not_found";
export const cannotRemoveSelfFromOrganizationError =
  "cannot_remove_self_from_organization";

export class OrganizationService {
  /**
   * Compute the prorated credits for a given month
   * Needed for users who sign up in the middle of the month
   * example: 1000 credits for 1 month, user signs up on day 15
   * prorated credits = (1000 / 30) * 15 = 500
   */
  private computeProratedCredits(
    monthlyTotal: number,
  ) {
    const numberOfDaysThisMonth = new Date().getDate();
    const numberOfDaysSinceStart = new Date().getDate();

    const proratedCredits = (monthlyTotal / numberOfDaysThisMonth) *
      numberOfDaysSinceStart;

    const roundedProratedCredits = Math.round(proratedCredits);

    return roundedProratedCredits;
  }

  /**
   * Create a personal organization for a user
   */
  public async createPersonalOrganization(
    userId: number,
  ): Promise<{
    organization?: Organization;
    error?: typeof organizationAlreadyExistsErrorCode;
  }> {
    const existingOrg = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .selectAll("organization")
      .where("organization_member.user_id", "=", userId)
      .where("organization.type", "=", "personal")
      .executeTakeFirst();

    if (existingOrg) {
      return {
        error: organizationAlreadyExistsErrorCode,
      };
    }

    let org: Organization | undefined;

    await db.transaction().execute(async (trx) => {
      org = await trx
        .insertInto("organization")
        .values({
          name: "personal",
          type: "personal",
          stripe_customer_id: null,
          access_enabled: false,
          monthly_included_credits:
            settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
          credits_balance: this.computeProratedCredits(
            settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
          ),
          created_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const stripeService = new StripeService();
      const stripeCustomer = await stripeService.createCustomer(
        org,
      );

      await trx
        .updateTable("organization")
        .set({
          stripe_customer_id: stripeCustomer.id,
        })
        .where("id", "=", org.id)
        .execute();

      await trx
        .insertInto("organization_member")
        .values({
          organization_id: org.id,
          user_id: userId,
          role: "admin",
          created_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    });

    if (!org) {
      throw new Error("Failed to create organization");
    }

    return {
      organization: org,
    };
  }

  /**
   * Create a new organization
   */
  public async createTeamOrganization(
    name: string,
    userId: number,
  ): Promise<{
    organization?: Organization;
    error?: typeof organizationAlreadyExistsErrorCode;
  }> {
    const existingOrg = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .selectAll("organization")
      .where("organization_member.user_id", "=", userId)
      .where("organization.name", "=", name)
      .where("organization.type", "=", "team")
      .executeTakeFirst();

    if (existingOrg) {
      return {
        error: organizationAlreadyExistsErrorCode,
      };
    }

    const org = await db
      .insertInto("organization")
      .values({
        name,
        type: "team",
        stripe_customer_id: null,
        access_enabled: false,
        monthly_included_credits: settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
        credits_balance: this.computeProratedCredits(
          settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
        ),
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    const stripeService = new StripeService();
    const stripeCustomer = await stripeService.createCustomer(
      org,
    );

    await db
      .updateTable("organization")
      .set({
        stripe_customer_id: stripeCustomer.id,
      })
      .where("id", "=", org.id)
      .execute();

    await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
        user_id: userId,
        role: "admin",
        created_at: new Date(),
      })
      .executeTakeFirst();

    return {
      organization: org,
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
      type: "personal" | "team";
      role: "admin" | "member";
    }[];
    total: number;
  }> {
    let countQuery = db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("organization_member.user_id", "=", userId);

    let baseQuery = db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .select([
        "organization.id",
        "organization.name",
        "organization.type",
        "organization_member.role",
      ])
      .where("organization_member.user_id", "=", userId);

    if (search) {
      baseQuery = baseQuery.where("organization.name", "like", `%${search}%`);
      countQuery = countQuery.where("organization.name", "like", `%${search}%`);
    }

    baseQuery = baseQuery
      .orderBy("organization.name", "asc")
      .limit(limit)
      .offset((page - 1) * limit);

    const [orgs, totalResult] = await Promise.all([
      baseQuery.execute(),
      countQuery.executeTakeFirst(),
    ]);

    const total = Number(totalResult?.total) || 0;

    return {
      results: orgs,
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
  ): Promise<{ organization?: Organization; error?: string }> {
    // Check if organization exists
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    // Check if user is an admin of the organization
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return { error: notAMemberOfOrganizationError };
    }

    if (member.role !== "admin") {
      return { error: notAnAdminOfOrganizationError };
    }

    // Update organization name
    const updatedOrg = await db
      .updateTable("organization")
      .set({ name })
      .where("id", "=", organizationId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      organization: updatedOrg,
    };
  }

  /**
   * Delete an organization
   */
  public async deleteOrganization(
    userId: number,
    organizationId: number,
  ): Promise<{ error?: string }> {
    // Check if organization exists
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    // Check if user is an admin of the organization
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return { error: notAMemberOfOrganizationError };
    }

    if (member.role !== "admin") {
      return { error: notAnAdminOfOrganizationError };
    }

    // Delete organization
    await db
      .deleteFrom("organization")
      .where("id", "=", organizationId)
      .execute();

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
    // Check if organization exists
    const organization = await db
      .selectFrom("organization")
      .select(["id", "name"])
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return {
        error: organizationNotFoundError,
      };
    }

    // Check if user has permission to invite users to this organization
    const member = await db
      .selectFrom("organization_member")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .selectAll()
      .executeTakeFirst();

    if (!member) {
      return {
        error: notAMemberOfOrganizationError,
      };
    }

    if (member.role !== "admin") {
      return {
        error: notAnAdminOfOrganizationError,
      };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.INVITATION.EXPIRY_DAYS);

    // Create invitation
    const invitation = await db
      .insertInto("organization_invitation")
      .values({
        organization_id: organizationId,
        expires_at: expiresAt,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Send invitation email
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
  ): Promise<{ success: boolean; error?: string }> {
    // Get invitation
    const invitation = await db
      .selectFrom("organization_invitation")
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    // Check if user is already a member of the organization
    const existingMember = await db
      .selectFrom("organization_member")
      .select("id")
      .where("user_id", "=", userId)
      .where("organization_id", "=", invitation.organization_id)
      .executeTakeFirst();

    if (existingMember) {
      return {
        success: false,
        error: "User is already a member of this organization",
      };
    }

    // Add user to organization
    await db
      .insertInto("organization_member")
      .values({
        user_id: userId,
        organization_id: invitation.organization_id,
        role: "member",
        created_at: new Date(),
      })
      .execute();

    // Delete the invitation
    await db
      .deleteFrom("organization_invitation")
      .where("uuid", "=", uuid)
      .execute();

    return { success: true };
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
      results?: { id: number; email: string; role: string }[];
      total?: number;
      error?: string;
    }
  > {
    // Check if organization exists
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    // Check if user is a member of the organization
    const userMembership = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!userMembership) {
      return { error: notAMemberOfOrganizationError };
    }

    // Get members with pagination and search
    let baseQuery = db
      .selectFrom("organization_member")
      .innerJoin("user", "user.id", "organization_member.user_id")
      .select([
        "organization_member.id",
        "user.email",
        "organization_member.role",
      ])
      .where("organization_member.organization_id", "=", organizationId);

    let countQuery = db
      .selectFrom("organization_member")
      .innerJoin("user", "user.id", "organization_member.user_id")
      .select(db.fn.count("organization_member.id").as("total"))
      .where("organization_member.organization_id", "=", organizationId);

    // Apply search if provided
    if (search) {
      baseQuery = baseQuery.where((eb) =>
        eb.or([
          eb("user.email", "like", `%${search}%`),
        ])
      );

      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("user.email", "like", `%${search}%`),
        ])
      );
    }

    baseQuery = baseQuery
      .orderBy("organization_member.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);

    const [members, totalResult] = await Promise.all([
      baseQuery.execute(),
      countQuery.executeTakeFirst(),
    ]);

    const total = Number(totalResult?.total) || 0;

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
    role: "admin" | "member",
  ): Promise<{ error?: string }> {
    // Check if organization exists
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    // Check if user is an admin of the organization
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return { error: notAMemberOfOrganizationError };
    }

    if (member.role !== "admin") {
      return { error: notAMemberOfOrganizationError };
    }

    // Update member role
    await db
      .updateTable("organization_member")
      .set({ role })
      .where("id", "=", memberId)
      .execute();

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
    // Check if organization exists
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return { error: organizationNotFoundError };
    }

    // Check if user is an admin of the organization
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return { error: notAMemberOfOrganizationError };
    }

    if (member.role !== "admin") {
      return { error: notAnAdminOfOrganizationError };
    }

    // Check if user is trying to remove themselves
    const memberToRemove = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("id", "=", memberId)
      .executeTakeFirst();

    if (!memberToRemove) {
      return { error: memberNotFoundError };
    }

    if (memberToRemove.user_id === userId) {
      return { error: cannotRemoveSelfFromOrganizationError };
    }

    // Remove member from organization
    await db
      .deleteFrom("organization_member")
      .where("id", "=", memberId)
      .execute();

    return {};
  }
}
