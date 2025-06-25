import { ADMIN_ROLE, db } from "@stackcore/db";
import { StripeService } from "../../stripe/index.ts";
import type { WorkspaceApiTypes } from "@stackcore/coreApiTypes";
import settings from "@stackcore/settings";

export const workspaceAlreadyExistsErrorCode = "workspace_already_exists";
export const workspaceNotFoundError = "workspace_not_found";
export const notAMemberOfWorkspaceError = "not_a_member_of_workspace";
export const notAnAdminOfWorkspaceError = "not_an_admin_of_workspace";
export const cannotDeactivatePersonalWorkspaceError =
  "cannot_deactivate_personal_workspace";
export const alreadyAMemberOfWorkspaceError = "already_a_member_of_workspace";
export const cannotCreateInvitationForPersonalWorkspaceError =
  "cannot_create_invitation_for_personal_workspace";
export const invitationNotFoundError = "invitation_not_found";
export const memberNotFoundError = "member_not_found";
export const cannotRemoveSelfFromWorkspaceError =
  "cannot_remove_self_from_workspace";
export const cannotUpdateSelfFromWorkspaceError =
  "cannot_update_self_from_workspace";

export class WorkspaceService {
  /**
   * Create a new workspace
   */
  public async createTeamWorkspace(
    name: string,
    userId: number,
  ): Promise<
    WorkspaceApiTypes.CreateWorkspaceResponse | {
      error: typeof workspaceAlreadyExistsErrorCode;
    }
  > {
    // First check if user is a member of any workspace with this name
    const existingWorkspace = await db
      .selectFrom("workspace")
      .innerJoin(
        "member",
        "member.workspace_id",
        "workspace.id",
      )
      .select("workspace.id")
      .where("member.user_id", "=", userId)
      .where("workspace.name", "=", name)
      .where("workspace.isTeam", "=", true)
      .executeTakeFirst();

    if (existingWorkspace) {
      return { error: workspaceAlreadyExistsErrorCode };
    }

    // Create workspace and member in a transaction
    const workspaceId = await db.transaction().execute(async (trx) => {
      // Create the workspace
      const workspace = await trx
        .insertInto("workspace")
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
        .insertInto("member")
        .values({
          role: ADMIN_ROLE,
          workspace_id: workspace.id,
          user_id: userId,
          created_at: new Date(),
        })
        .execute();

      // Create Stripe customer
      const stripeService = new StripeService();
      const customer = await stripeService.createCustomer(
        workspace.id,
        workspace.name,
      );
      const subscription = await stripeService.createSubscription(
        customer.id,
        "BASIC",
        "MONTHLY",
        settings.STRIPE.BILLING_THRESHOLD_BASIC,
      );

      const accessEnabled = stripeService.shouldHaveAccess(
        subscription.status,
      );

      // Update workspace with Stripe customer ID
      await trx
        .updateTable("workspace")
        .set({
          stripe_customer_id: customer.id,
          access_enabled: accessEnabled,
        })
        .where("id", "=", workspace.id)
        .execute();

      return workspace.id;
    });

    return {
      id: workspaceId,
    };
  }

  /**
   * Get all workspaces for a user
   */
  public async getWorkspaces(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<WorkspaceApiTypes.GetWorkspacesResponse> {
    // Get total count of workspaces
    const totalResult = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("workspace.name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .executeTakeFirst();

    const total = Number(totalResult?.total) || 0;

    // Get paginated workspaces
    const workspaces = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select([
        "workspace.id",
        "workspace.name",
        "workspace.isTeam",
        "member.role",
        "workspace.access_enabled",
      ])
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("workspace.name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .orderBy("workspace.name", "asc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    return {
      results: workspaces,
      total,
    };
  }

  /**
   * Update a workspace
   */
  public async updateWorkspace(
    userId: number,
    workspaceId: number,
    name: string,
  ): Promise<{ error?: string }> {
    // First check if user is a member of the workspace and workspace
    const memberCheck = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select(["member.role"])
      .where("member.user_id", "=", userId)
      .where("member.workspace_id", "=", workspaceId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!memberCheck) {
      return { error: workspaceNotFoundError };
    }

    if (memberCheck.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfWorkspaceError };
    }

    // Update workspace name
    await db
      .updateTable("workspace")
      .set({ name })
      .where("id", "=", workspaceId)
      .execute();

    return {};
  }

  /**
   * Delete an workspace
   */
  public async deactivateWorkspace(
    userId: number,
    workspaceId: number,
  ): Promise<{ error?: string }> {
    // First check if user is a member of the workspace
    const memberCheck = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select(["member.role"])
      .where("member.user_id", "=", userId)
      .where("member.workspace_id", "=", workspaceId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!memberCheck) {
      return { error: workspaceNotFoundError };
    }

    if (memberCheck.role !== ADMIN_ROLE) {
      return { error: notAnAdminOfWorkspaceError };
    }

    // Check if it's a personal workspace
    const workspace = await db
      .selectFrom("workspace")
      .where("id", "=", workspaceId)
      .selectAll()
      .executeTakeFirstOrThrow();

    if (!workspace.isTeam) {
      return { error: cannotDeactivatePersonalWorkspaceError };
    }

    // Deactivate workspace members and workspace in a transaction
    await db.transaction().execute(async (trx) => {
      // First delete all workspace members
      await trx
        .deleteFrom("member")
        .where("workspace_id", "=", workspaceId)
        .execute();

      // Then deactivate the workspace
      await trx
        .updateTable("workspace")
        .set({ deactivated: true })
        .where("id", "=", workspaceId)
        .execute();

      // Cancel Stripe subscription
      if (workspace.stripe_customer_id) {
        const stripeService = new StripeService();
        await stripeService.cancelSubscription(workspace.stripe_customer_id);
      }
    });

    return {};
  }
}
