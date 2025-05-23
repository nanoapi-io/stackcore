import { db } from "../../db/database.ts";
import {
  ADMIN_ROLE,
  type OrganizationMemberRole,
} from "../../db/models/organizationMember.ts";

export const notMemberOfOrganizationError = "not_member_of_organization";
export const notAdminOfOrganizationError = "not_admin_of_organization";
export const memberNotFoundError = "member_not_found";
export const cannotUpdateSelfError = "cannot_update_yourself";

export class MemberService {
  /**
   * Get members of the current user
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
        role: OrganizationMemberRole | null;
      }[];
      total: number;
    } | {
      error: string;
    }
  > {
    // check if user is a member of the organization
    const userMember = await db
      .selectFrom("organization_member")
      .select(["id"])
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfOrganizationError };
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
    memberId: number,
    role: OrganizationMemberRole,
  ): Promise<{ error?: string }> {
    // First check if user is an admin of the organization of the member

    const member = await db
      .selectFrom("organization_member")
      .select(["id", "organization_id"])
      .where("id", "=", memberId)
      .executeTakeFirst();

    if (!member) {
      return { error: memberNotFoundError };
    }

    const userMember = await db
      .selectFrom("organization_member")
      .select(["id", "role"])
      .where("user_id", "=", userId)
      .where("organization_id", "=", member.organization_id)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfOrganizationError };
    }

    if (userMember.role !== ADMIN_ROLE) {
      return { error: notAdminOfOrganizationError };
    }

    if (userMember.id === member.id) {
      return { error: cannotUpdateSelfError };
    }

    // Update member role
    await db
      .updateTable("organization_member")
      .set({ role })
      .where("id", "=", memberId)
      .executeTakeFirstOrThrow();

    return {};
  }

  /**
   * Remove a member from an organization
   */
  public async removeMemberFromOrganization(
    userId: number,
    memberId: number,
  ): Promise<{ error?: string }> {
    const member = await db
      .selectFrom("organization_member")
      .select(["id", "organization_id"])
      .where("id", "=", memberId)
      .executeTakeFirst();

    if (!member) {
      return { error: memberNotFoundError };
    }

    const userMember = await db
      .selectFrom("organization_member")
      .select(["id", "role"])
      .where("user_id", "=", userId)
      .where("organization_id", "=", member.organization_id)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfOrganizationError };
    }

    if (userMember.role !== ADMIN_ROLE) {
      return { error: notAdminOfOrganizationError };
    }

    if (userMember.id === member.id) {
      return { error: cannotUpdateSelfError };
    }

    // Remove member from organization
    await db
      .deleteFrom("organization_member")
      .where("id", "=", memberId)
      .executeTakeFirstOrThrow();

    return {};
  }
}
