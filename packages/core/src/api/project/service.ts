import { db } from "../../db/database.ts";
import type { Project } from "../../db/models/project.ts";

export const projectAlreadyExistsErrorCode = "project_already_exists";
export const projectNotFoundError = "project_not_found";
export const notAMemberOfWorkspaceError = "not_a_member_of_workspace";

export class ProjectService {
  /**
   * Create a new project
   */
  public async createProject(
    userId: number,
    name: string,
    workspaceId: number,
    provider: "github" | "gitlab" | null,
    providerId: string | null,
  ): Promise<{
    error?: string;
  }> {
    // Check if user is a member of the workspace
    const isMember = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select("user_id")
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    // Check if project with same name exists
    const existingProject = await db
      .selectFrom("project")
      .select("id")
      .where("name", "=", name)
      .where("workspace_id", "=", workspaceId)
      .executeTakeFirst();

    if (existingProject) {
      return { error: projectAlreadyExistsErrorCode };
    }

    // Create the project
    await db
      .insertInto("project")
      .values({
        name,
        workspace_id: workspaceId,
        provider: provider,
        provider_id: providerId,
        created_at: new Date(),
      })
      .execute();

    return {};
  }

  /**
   * Get all projects for an workspace
   */
  public async getProjects(
    userId: number,
    page: number,
    limit: number,
    search?: string,
    workspaceId?: number,
  ): Promise<{
    results?: Project[];
    total?: number;
    error?: string;
  }> {
    // First check if user has access to the workspace
    if (workspaceId) {
      const hasAccess = await db
        .selectFrom("member")
        .innerJoin(
          "workspace",
          "workspace.id",
          "member.workspace_id",
        )
        .where("user_id", "=", userId)
        .where("workspace_id", "=", workspaceId)
        .where("workspace.deactivated", "=", false)
        .executeTakeFirst();

      if (!hasAccess) {
        return { error: notAMemberOfWorkspaceError };
      }
    }

    // Get total count of accessible projects
    const totalResult = await db
      .selectFrom("project")
      .innerJoin(
        "member",
        "member.workspace_id",
        "project.workspace_id",
      )
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("member.user_id", "=", userId)
      .where((eb) => {
        if (workspaceId) {
          return eb.and([
            eb("project.workspace_id", "=", workspaceId),
          ]);
        }
        return eb.and([]);
      })
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("project.name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .executeTakeFirst();

    const total = Number(totalResult?.total) || 0;

    // Get paginated projects
    const projects = await db
      .selectFrom("project")
      .selectAll()
      .innerJoin(
        "member",
        "member.workspace_id",
        "project.workspace_id",
      )
      .where("member.user_id", "=", userId)
      .where((eb) => {
        if (workspaceId) {
          return eb.and([
            eb("project.workspace_id", "=", workspaceId),
          ]);
        }
        return eb.and([]);
      })
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("project.name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .orderBy("name", "asc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    return {
      results: projects,
      total,
    };
  }

  /**
   * Update a project
   */
  public async updateProject(
    userId: number,
    projectId: number,
    updates: {
      name?: string;
      provider?: "github" | "gitlab" | null;
      providerId?: string | null;
    },
  ): Promise<{
    error?: string;
  }> {
    // First check if project exists and user has access
    const project = await db
      .selectFrom("project")
      .innerJoin(
        "workspace",
        "workspace.id",
        "project.workspace_id",
      )
      .innerJoin(
        "member",
        "member.workspace_id",
        "project.workspace_id",
      )
      .where("member.user_id", "=", userId)
      .where("project.id", "=", projectId)
      .where("workspace.deactivated", "=", false)
      .select([
        "project.name",
        "project.provider",
        "project.provider_id",
        "project.workspace_id",
      ])
      .executeTakeFirst();

    if (!project) {
      return { error: projectNotFoundError };
    }

    // If name is being updated, check for duplicates
    if (updates.name && updates.name !== project.name) {
      const existingProject = await db
        .selectFrom("project")
        .select("id")
        .where("name", "=", updates.name)
        .where("workspace_id", "=", project.workspace_id)
        .executeTakeFirst();

      if (existingProject) {
        return { error: projectAlreadyExistsErrorCode };
      }
    }

    // Update the project
    await db
      .updateTable("project")
      .set({
        name: updates.name ?? project.name,
        provider: updates.provider ?? project.provider,
        provider_id: updates.providerId ?? project.provider_id,
      })
      .where("id", "=", projectId)
      .execute();

    return {};
  }

  /**
   * Delete a project
   */
  public async deleteProject(
    userId: number,
    projectId: number,
  ): Promise<{ error?: string }> {
    // First check if project exists and user has access
    const project = await db
      .selectFrom("project")
      .innerJoin(
        "workspace",
        "workspace.id",
        "project.workspace_id",
      )
      .innerJoin(
        "member",
        "member.workspace_id",
        "project.workspace_id",
      )
      .where("member.user_id", "=", userId)
      .where("project.id", "=", projectId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!project) {
      return { error: projectNotFoundError };
    }

    // Delete the project
    await db
      .deleteFrom("project")
      .where("id", "=", projectId)
      .execute();

    return {};
  }
}
