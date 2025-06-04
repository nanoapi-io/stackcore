import { db } from "../../db/database.ts";
import type {
  GetProjectDetailsResponse,
  GetProjectsResponse,
} from "./types.ts";

export const projectAlreadyExistsErrorCode = "project_already_exists";
export const projectNotFoundError = "project_not_found";
export const notAMemberOfWorkspaceError = "not_a_member_of_workspace";

export class ProjectService {
  /**
   * Create a new project
   */
  public async createProject(
    userId: number,
    project: {
      name: string;
      workspaceId: number;
      maxCodeCharPerSymbol: number;
      maxCodeCharPerFile: number;
      maxCharPerSymbol: number;
      maxCharPerFile: number;
      maxCodeLinePerSymbol: number;
      maxCodeLinePerFile: number;
      maxLinePerSymbol: number;
      maxLinePerFile: number;
      maxDependencyPerSymbol: number;
      maxDependencyPerFile: number;
      maxDependentPerSymbol: number;
      maxDependentPerFile: number;
      maxCyclomaticComplexityPerSymbol: number;
      maxCyclomaticComplexityPerFile: number;
    },
  ): Promise<
    {
      id: number;
    } | {
      error: string;
    }
  > {
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
      .where("workspace_id", "=", project.workspaceId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    // Check if project with same name exists
    const existingProject = await db
      .selectFrom("project")
      .select("id")
      .where("name", "=", project.name)
      .where("workspace_id", "=", project.workspaceId)
      .executeTakeFirst();

    if (existingProject) {
      return { error: projectAlreadyExistsErrorCode };
    }

    // Create the project
    const newProject = await db
      .insertInto("project")
      .values({
        name: project.name,
        workspace_id: project.workspaceId,
        max_code_char_per_symbol: project.maxCodeCharPerSymbol,
        max_code_char_per_file: project.maxCodeCharPerFile,
        max_char_per_symbol: project.maxCharPerSymbol,
        max_char_per_file: project.maxCharPerFile,
        max_code_line_per_symbol: project.maxCodeLinePerSymbol,
        max_code_line_per_file: project.maxCodeLinePerFile,
        max_line_per_symbol: project.maxLinePerSymbol,
        max_line_per_file: project.maxLinePerFile,
        max_dependency_per_symbol: project.maxDependencyPerSymbol,
        max_dependency_per_file: project.maxDependencyPerFile,
        max_dependent_per_symbol: project.maxDependentPerSymbol,
        max_dependent_per_file: project.maxDependentPerFile,
        max_cyclomatic_complexity_per_symbol:
          project.maxCyclomaticComplexityPerSymbol,
        max_cyclomatic_complexity_per_file:
          project.maxCyclomaticComplexityPerFile,
        created_at: new Date(),
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    return { id: newProject.id };
  }

  /**
   * Get project details by ID
   */
  public async getProjectDetails(
    userId: number,
    projectId: number,
  ): Promise<{ error?: string } | GetProjectDetailsResponse> {
    // Get project with access check via workspace membership
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
      .where("project.id", "=", projectId)
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .selectAll("project")
      .executeTakeFirst();

    if (!project) {
      return { error: projectNotFoundError };
    }

    return project as GetProjectDetailsResponse;
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
  ): Promise<{ error: string } | GetProjectsResponse> {
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
      .selectAll("project")
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
      name: string;
      maxCodeCharPerSymbol: number;
      maxCodeCharPerFile: number;
      maxCharPerSymbol: number;
      maxCharPerFile: number;
      maxCodeLinePerSymbol: number;
      maxCodeLinePerFile: number;
      maxLinePerSymbol: number;
      maxLinePerFile: number;
      maxDependencyPerSymbol: number;
      maxDependencyPerFile: number;
      maxDependentPerSymbol: number;
      maxDependentPerFile: number;
      maxCyclomaticComplexityPerSymbol: number;
      maxCyclomaticComplexityPerFile: number;
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
        name: updates.name,
        max_code_char_per_symbol: updates.maxCodeCharPerSymbol,
        max_code_char_per_file: updates.maxCodeCharPerFile,
        max_char_per_symbol: updates.maxCharPerSymbol,
        max_char_per_file: updates.maxCharPerFile,
        max_code_line_per_symbol: updates.maxCodeLinePerSymbol,
        max_code_line_per_file: updates.maxCodeLinePerFile,
        max_line_per_symbol: updates.maxLinePerSymbol,
        max_line_per_file: updates.maxLinePerFile,
        max_dependency_per_symbol: updates.maxDependencyPerSymbol,
        max_dependency_per_file: updates.maxDependencyPerFile,
        max_dependent_per_symbol: updates.maxDependentPerSymbol,
        max_dependent_per_file: updates.maxDependentPerFile,
        max_cyclomatic_complexity_per_symbol:
          updates.maxCyclomaticComplexityPerSymbol,
        max_cyclomatic_complexity_per_file:
          updates.maxCyclomaticComplexityPerFile,
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
