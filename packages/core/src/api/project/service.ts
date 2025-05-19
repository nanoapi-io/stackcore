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
    project?: Project;
    error?: string;
  }> {
    // Check if user is a member of the organization
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return { error: notAMemberOfOrganizationError };
    }

    // Check if project with the same name exists in the organization
    const existingProject = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", name)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (existingProject) {
      return { error: projectAlreadyExistsErrorCode };
    }

    // Create the project
    const project = await db
      .insertInto("project")
      .values({
        name,
        organization_id: organizationId,
        provider: provider || null,
        provider_id: providerId || null,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { project };
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
    let countQuery = db
      .selectFrom("project")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("organization_member.user_id", "=", userId);

    let baseQuery = db
      .selectFrom("project")
      .selectAll()
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .where("organization_member.user_id", "=", userId);

    if (organizationId) {
      baseQuery = baseQuery.where(
        "project.organization_id",
        "=",
        organizationId,
      );
      countQuery = countQuery.where(
        "project.organization_id",
        "=",
        organizationId,
      );
    }

    if (search) {
      baseQuery = baseQuery.where("project.name", "like", `%${search}%`);
      countQuery = countQuery.where("project.name", "like", `%${search}%`);
    }

    baseQuery = baseQuery
      .orderBy("name", "asc")
      .limit(limit)
      .offset((page - 1) * limit);

    const [projects, totalResult] = await Promise.all([
      baseQuery.execute(),
      countQuery.executeTakeFirst(),
    ]);

    const total = Number(totalResult?.total) || 0;

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
    project?: Project;
    error?: string;
  }> {
    // Check if project exists
    const project = await db
      .selectFrom("project")
      .selectAll()
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .where("organization_member.user_id", "=", userId)
      .where("project.id", "=", projectId)
      .executeTakeFirst();

    if (!project) {
      return { error: projectNotFoundError };
    }

    // Update the project
    const updatedProject = await db
      .updateTable("project")
      .set({
        name: updates.name !== undefined ? updates.name : project.name,
        provider: updates.provider !== undefined
          ? updates.provider
          : project.provider,
        provider_id: updates.providerId !== undefined
          ? updates.providerId
          : project.provider_id,
      })
      .where("id", "=", projectId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { project: updatedProject };
  }

  /**
   * Delete a project
   */
  public async deleteProject(
    userId: number,
    projectId: number,
  ): Promise<{ error?: string }> {
    // Check if project exists
    const project = await db
      .selectFrom("project")
      .selectAll()
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "project.organization_id",
      )
      .where("organization_member.user_id", "=", userId)
      .where("project.id", "=", projectId)
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
