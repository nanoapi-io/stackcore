import { db } from "@stackcore/db";
import { generateAuditManifest } from "../../manifest/service.ts";
import settings from "@stackcore/settings";
import { StripeService } from "../../stripe/index.ts";
import type { ManifestApiTypes } from "@stackcore/coreApiTypes";
import {
  downloadManifestFromBucket,
  getManifestPublicLink,
  uploadManifestToBucket,
} from "@stackcore/storage";
import type { DependencyManifest } from "@stackcore/manifests";

export const manifestNotFoundError = "manifest_not_found";
export const projectNotFoundError = "project_not_found";
export const notAMemberOfWorkspaceError = "not_a_member_of_workspace";
export const failedToGenerateAuditManifestError =
  "failed_to_generate_audit_manifest";
export const accessDisabledError = "access_disabled";

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
  ): Promise<
    {
      id: number;
    } | {
      error: string;
    }
  > {
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

    const workspace = await db
      .selectFrom("workspace")
      .innerJoin("project", "project.workspace_id", "workspace.id")
      .innerJoin("member", "member.workspace_id", "workspace.id")
      .where("project.id", "=", projectId)
      .where("member.user_id", "=", userId)
      .where("workspace.deactivated", "=", false)
      .selectAll("workspace")
      .executeTakeFirstOrThrow();

    if (!workspace.stripe_customer_id) {
      throw new Error("Workspace does not have a stripe customer ID");
    }

    if (!workspace.access_enabled) {
      return { error: accessDisabledError };
    }

    const manifestFileName = `${projectId}-${Date.now()}.json`;
    await uploadManifestToBucket(manifest, manifestFileName);

    // Create the manifest
    const newManifest = await db
      .insertInto("manifest")
      .values({
        project_id: projectId,
        branch,
        commitSha,
        commitShaDate,
        version: settings.MANIFEST.DEFAULT_VERSION,
        manifest: manifestFileName,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const stripeService = new StripeService();

    await stripeService.sendUsageEvent(
      workspace.stripe_customer_id,
      settings.STRIPE.METER.CREDIT_USAGE_MANIFEST_CREATE,
    );

    return { id: newManifest.id };
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
    ManifestApiTypes.GetManifestsResponse | {
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
  ): Promise<ManifestApiTypes.GetManifestDetailsResponse | { error?: string }> {
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

    const publicLink = await getManifestPublicLink(manifest.manifest);

    return {
      ...manifest,
      manifest: publicLink,
    };
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

  /**
   * Get manifest audit for a manifest
   */
  public async getManifestAudit(
    userId: number,
    manifestId: number,
  ): Promise<ManifestApiTypes.GetManifestAuditResponse | { error?: string }> {
    // Get manifest with access check
    const manifest = await db
      .selectFrom("manifest")
      .selectAll("manifest")
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

    // Get project
    const project = await db
      .selectFrom("project")
      .selectAll("project")
      .where("id", "=", manifest.project_id)
      .executeTakeFirst();

    if (!project) {
      return { error: projectNotFoundError };
    }

    const manifestJson = await downloadManifestFromBucket(
      manifest.manifest,
    );

    try {
      const auditManifest = generateAuditManifest(
        manifest.version,
        manifestJson as DependencyManifest,
        {
          file: {
            maxCodeChar: project.max_char_per_file,
            maxChar: project.max_char_per_file,
            maxCodeLine: project.max_line_per_file,
            maxLine: project.max_line_per_file,
            maxDependency: project.max_dependency_per_file,
            maxDependent: project.max_dependent_per_file,
            maxCyclomaticComplexity: project.max_cyclomatic_complexity_per_file,
          },
          symbol: {
            maxCodeChar: project.max_char_per_symbol,
            maxChar: project.max_char_per_symbol,
            maxCodeLine: project.max_line_per_symbol,
            maxLine: project.max_line_per_symbol,
            maxDependency: project.max_dependency_per_symbol,
            maxDependent: project.max_dependent_per_symbol,
            maxCyclomaticComplexity:
              project.max_cyclomatic_complexity_per_symbol,
          },
        },
      );

      return auditManifest;
    } catch (error) {
      console.error(error);
      return { error: failedToGenerateAuditManifestError };
    }
  }
}
