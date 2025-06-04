import { db } from "../../db/database.ts";
import settings from "../../settings.ts";
import type {
  GetManifestDetailsResponse,
  GetManifestsResponse,
} from "./types.ts";

export const manifestNotFoundError = "manifest_not_found";
export const projectNotFoundError = "project_not_found";
export const notAMemberOfWorkspaceError = "not_a_member_of_workspace";

export class ManifestService {
  /**
   * Create a new manifest
   */
  public async createManifest(
    userId: number,
    projectId: number,
    branch: string | null,
    commitSha: string | null,
    commitShaDate: Date | null,
    manifest: object,
  ): Promise<{
    manifestId?: number;
    error?: string;
  }> {
    // Check if user has access to the project via workspace membership
    const hasAccess = await db
      .selectFrom("project")
      .innerJoin("workspace", "workspace.id", "project.workspace_id")
      .innerJoin("member", "member.workspace_id", "project.workspace_id")
      .where("project.id", "=", projectId)
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!hasAccess) {
      return { error: projectNotFoundError };
    }

    // Create the manifest
    const result = await db
      .insertInto("manifest")
      .values({
        project_id: projectId,
        branch,
        commitSha,
        commitShaDate,
        version: settings.MANIFEST.DEFAULT_VERSION,
        manifest,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirst();

    return { manifestId: result?.id };
  }

  /**
   * Get manifests with pagination and optional filtering
   */
  public async getManifests(
    userId: number,
    page: number,
    limit: number,
    search?: string,
    projectId?: number,
    workspaceId?: number,
  ): Promise<
    GetManifestsResponse | {
      error?: string;
    }
  > {
    // Build base query for accessible manifests
    let baseQuery = db
      .selectFrom("manifest")
      .innerJoin("project", "project.id", "manifest.project_id")
      .innerJoin("workspace", "workspace.id", "project.workspace_id")
      .innerJoin("member", "member.workspace_id", "project.workspace_id")
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false);

    // Apply project filter if specified
    if (projectId) {
      // First verify user has access to this specific project
      const hasAccessToProject = await db
        .selectFrom("project")
        .innerJoin("workspace", "workspace.id", "project.workspace_id")
        .innerJoin("member", "member.workspace_id", "project.workspace_id")
        .where("project.id", "=", projectId)
        .where("member.user_id", "=", userId)
        .where("workspace.deactivated", "=", false)
        .executeTakeFirst();

      if (!hasAccessToProject) {
        return { error: projectNotFoundError };
      }

      baseQuery = baseQuery.where("manifest.project_id", "=", projectId);
    }

    // Apply workspace filter if specified
    if (workspaceId) {
      // First verify user has access to this workspace
      const hasAccessToWorkspace = await db
        .selectFrom("member")
        .innerJoin("workspace", "workspace.id", "member.workspace_id")
        .where("member.user_id", "=", userId)
        .where("workspace.id", "=", workspaceId)
        .where("workspace.deactivated", "=", false)
        .executeTakeFirst();

      if (!hasAccessToWorkspace) {
        return { error: notAMemberOfWorkspaceError };
      }

      baseQuery = baseQuery.where("project.workspace_id", "=", workspaceId);
    }

    // Apply search filter if specified
    if (search) {
      baseQuery = baseQuery.where((eb) =>
        eb.or([
          eb("manifest.branch", "like", `%${search}%`),
          eb("manifest.commitSha", "like", `%${search}%`),
          eb("project.name", "like", `%${search}%`),
        ])
      );
    }

    // Get total count
    const totalResult = await baseQuery
      .select(({ fn }) => [fn.countAll().as("total")])
      .executeTakeFirst();

    const total = Number(totalResult?.total) || 0;

    // Get paginated results (excluding the full manifest content)
    const manifests = await baseQuery
      .select([
        "manifest.id",
        "manifest.project_id",
        "manifest.created_at",
        "manifest.branch",
        "manifest.commitSha",
        "manifest.commitShaDate",
        "manifest.version",
        // Exclude manifest.manifest field for list view
      ])
      .orderBy("manifest.created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    return {
      results: manifests,
      total,
    };
  }

  /**
   * Get manifest details including full manifest content
   */
  public async getManifestDetails(
    userId: number,
    manifestId: number,
  ): Promise<GetManifestDetailsResponse | { error?: string }> {
    // Get manifest with access check
    const manifest = await db
      .selectFrom("manifest")
      .innerJoin("project", "project.id", "manifest.project_id")
      .innerJoin("workspace", "workspace.id", "project.workspace_id")
      .innerJoin("member", "member.workspace_id", "project.workspace_id")
      .where("manifest.id", "=", manifestId)
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .selectAll("manifest")
      .executeTakeFirst();

    if (!manifest) {
      return { error: manifestNotFoundError };
    }

    return manifest;
  }

  /**
   * Delete a manifest
   */
  public async deleteManifest(
    userId: number,
    manifestId: number,
  ): Promise<{ error?: string }> {
    // First check if manifest exists and user has access
    const manifest = await db
      .selectFrom("manifest")
      .innerJoin("project", "project.id", "manifest.project_id")
      .innerJoin("workspace", "workspace.id", "project.workspace_id")
      .innerJoin("member", "member.workspace_id", "project.workspace_id")
      .where("manifest.id", "=", manifestId)
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!manifest) {
      return { error: manifestNotFoundError };
    }

    // Delete the manifest
    await db
      .deleteFrom("manifest")
      .where("id", "=", manifestId)
      .execute();

    return {};
  }
}
