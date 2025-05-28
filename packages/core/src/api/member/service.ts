import { db } from "../../db/database.ts";
import { ADMIN_ROLE, type MemberRole } from "../../db/models/member.ts";
import type { GetMembersResponse } from "./types.ts";

export const notMemberOfWorkspaceError = "not_member_of_workspace";
export const notAdminOfWorkspaceError = "not_admin_of_workspace";
export const memberNotFoundError = "member_not_found";
export const cannotUpdateSelfError = "cannot_update_yourself";

export class MemberService {
  /**
   * Get members of the current user
   */
  public async getMembers(
    userId: number,
    workspaceId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ error: string } | GetMembersResponse> {
    // check if user is a member of the workspace
    const userMember = await db
      .selectFrom("member")
      .select(["id"])
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfWorkspaceError };
    }

    // Get total count of members
    const totalResult = await db
      .selectFrom("member")
      .innerJoin("user", "user.id", "member.user_id")
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("member.workspace_id", "=", workspaceId)
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
      .selectFrom("member")
      .innerJoin("user", "user.id", "member.user_id")
      .select([
        "member.id",
        "user.id as user_id",
        "user.email",
        "member.role",
      ])
      .where("member.workspace_id", "=", workspaceId)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("user.email", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .orderBy("member.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    return {
      results: members,
      total,
    };
  }

  /**
   * Update a member's role in an workspace
   */
  public async updateMemberRole(
    userId: number,
    memberId: number,
    role: MemberRole,
  ): Promise<{ error?: string }> {
    // First check if user is an admin of the workspace of the member

    const member = await db
      .selectFrom("member")
      .select(["id", "workspace_id"])
      .where("id", "=", memberId)
      .executeTakeFirst();

    if (!member) {
      return { error: memberNotFoundError };
    }

    const userMember = await db
      .selectFrom("member")
      .select(["id", "role"])
      .where("user_id", "=", userId)
      .where("workspace_id", "=", member.workspace_id)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfWorkspaceError };
    }

    if (userMember.role !== ADMIN_ROLE) {
      return { error: notAdminOfWorkspaceError };
    }

    if (userMember.id === member.id) {
      return { error: cannotUpdateSelfError };
    }

    // Update member role
    await db
      .updateTable("member")
      .set({ role })
      .where("id", "=", memberId)
      .executeTakeFirstOrThrow();

    return {};
  }

  /**
   * Remove a member from an workspace
   */
  public async removeMemberFromWorkspace(
    userId: number,
    memberId: number,
  ): Promise<{ error?: string }> {
    const member = await db
      .selectFrom("member")
      .select(["id", "workspace_id"])
      .where("id", "=", memberId)
      .executeTakeFirst();

    if (!member) {
      return { error: memberNotFoundError };
    }

    const userMember = await db
      .selectFrom("member")
      .select(["id", "role"])
      .where("user_id", "=", userId)
      .where("workspace_id", "=", member.workspace_id)
      .executeTakeFirst();

    if (!userMember) {
      return { error: notMemberOfWorkspaceError };
    }

    if (userMember.role !== ADMIN_ROLE) {
      return { error: notAdminOfWorkspaceError };
    }

    if (userMember.id === member.id) {
      return { error: cannotUpdateSelfError };
    }

    // Remove member from workspace
    await db
      .deleteFrom("member")
      .where("id", "=", memberId)
      .executeTakeFirstOrThrow();

    return {};
  }
}
