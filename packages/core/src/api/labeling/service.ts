import { db } from "@stackcore/db";
import { uploadTemporaryFileToBucket } from "@stackcore/storage";
import type { UploadTemporaryContentResponse } from "./types.ts";
import settings from "@stackcore/settings";

export const manifestNotFoundError = "manifest_not_found";

export class LabelingService {
  public async uploadTemporaryContent(
    path: string,
    content: string,
  ): Promise<UploadTemporaryContentResponse> {
    const fileName = `${Date.now()}|${path}`;

    await uploadTemporaryFileToBucket(fileName, content);

    return { path, bucketName: fileName };
  }

  public async startLabeling(
    userId: number,
    manifestId: number,
    fileMapName: string,
  ): Promise<{ error: string } | { message: string }> {
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

    if (!settings.LABELER.SKIP_CLOUD_TASK) {
      // We do not await this, to simulate send and forget, like a cloud task
      fetch(`${settings.LABELER.SERVICE_URL}/start`, {
        method: "POST",
        body: JSON.stringify({
          manifestId,
          fileMapName,
        }),
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": settings.LABELER.LABELER_API_KEY,
        },
      });
    } else {
      // TODO: implement cloud task
      throw new Error("Cloud task not implemented");
    }

    return { message: "Labeling successfully requested" };
  }
}
