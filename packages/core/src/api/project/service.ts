import { db } from "../../db/database.ts";
import type { Project } from "../../db/types.ts";

export const projectAlreadyExistsErrorCode = "project_already_exists";
export const projectNotFoundError = "project_not_found";
export const notAMemberOfOrganizationError = "not_a_member_of_organization";

export class ProjectService {
  /**
   * Create a new project
   */
  public async createProject(
    userId: number,
    name: string,
    organizationId: number,
    provider: "github" | "gitlab" | null,
    providerId: string | null,
  ): Promise<{
    error?: string;
  }> {
    // Check if user is a member of the organization
    const isMember = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select("user_id")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfOrganizationError };
    }

    // Check if project with same name exists
    const existingProject = await db
      .selectFrom("project")
      .select("id")
      .where("name", "=", name)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (existingProject) {
      return { error: projectAlreadyExistsErrorCode };
    }

    // Create the project
    await db
      .insertInto("project")
      .values({
        name,
        organization_id: organizationId,
        provider: provider || null,
        provider_id: providerId || null,
        created_at: new Date(),
      })
      .execute();

    return {};
  }

  /**
   * Get all projects for an organization
   */
  public async getProjects(
    userId: number,
    page: number,
    limit: number,
    search?: string,
    organizationId?: number,
  ): Promise<{
    results?: Project[];
    total?: number;
    error?: string;
  }> {
    // First check if user has access to the organization
    if (organizationId) {
      const hasAccess = await db
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

      if (!hasAccess) {
        return { error: notAMemberOfOrganizationError };
      }
    }

    // Get total count of accessible projects
    const totalResult = await db
      .selectFrom("project")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("organization_member.user_id", "=", userId)
      .where((eb) => {
        if (organizationId) {
          return eb.and([
            eb("project.organization_id", "=", organizationId),
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
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .where("organization_member.user_id", "=", userId)
      .where((eb) => {
        if (organizationId) {
          return eb.and([
            eb("project.organization_id", "=", organizationId),
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
        "organization",
        "organization.id",
        "project.organization_id",
      )
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .where("organization_member.user_id", "=", userId)
      .where("project.id", "=", projectId)
      .where("organization.deactivated", "=", false)
      .select([
        "project.name",
        "project.provider",
        "project.provider_id",
        "project.organization_id",
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
        .where("organization_id", "=", project.organization_id)
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
        "organization",
        "organization.id",
        "project.organization_id",
      )
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .where("organization_member.user_id", "=", userId)
      .where("project.id", "=", projectId)
      .where("organization.deactivated", "=", false)
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
