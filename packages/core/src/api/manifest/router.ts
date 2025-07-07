import { Router, Status } from "@oak/oak";
import { ManifestService } from "./service.ts";
import { authMiddleware, getSession } from "../auth/middleware.ts";
import type {
  dependencyManifestTypes,
  manifestApiTypes,
} from "@stackcore/shared";
import z from "zod";
import settings from "../../settings.ts";

const manifestService = new ManifestService();
const router = new Router();

// Create a new manifest
router.post("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const createManifestPayloadSchema = z.object({
    projectId: z.number(),
    branch: z.string().nullable(),
    commitSha: z.string().nullable(),
    commitShaDate: z.string().nullable().transform((val) =>
      val ? new Date(val) : null
    ),
    manifest: z.object({}).passthrough(), // Allow any object structure
  });

  const parsedBody = createManifestPayloadSchema.safeParse(
    body,
  );

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const response = await manifestService.createManifest(
    session.userId,
    parsedBody.data.projectId,
    parsedBody.data.branch,
    parsedBody.data.commitSha,
    parsedBody.data.commitShaDate,
    parsedBody.data.manifest as dependencyManifestTypes.DependencyManifest,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.Created;
  ctx.response.body = response as manifestApiTypes.CreateManifestResponse;
});

// Get manifests with pagination and filtering
router.get("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const searchParamsSchema = z.object({
    search: z.string().optional(),
    projectId: z.number().int().optional(),
    workspaceId: z.number().int().optional(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(settings.PAGINATION.MAX_LIMIT),
  });

  const searchParams = Object.fromEntries(ctx.request.url.searchParams);

  const parsedSearchParams = searchParamsSchema.safeParse({
    ...searchParams,
    page: Number(searchParams.page),
    limit: Number(searchParams.limit),
    projectId: searchParams.projectId
      ? Number(searchParams.projectId)
      : undefined,
    workspaceId: searchParams.workspaceId
      ? Number(searchParams.workspaceId)
      : undefined,
  });

  if (!parsedSearchParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedSearchParams.error };
    return;
  }

  const response = await manifestService.getManifests(
    session.userId,
    parsedSearchParams.data.page,
    parsedSearchParams.data.limit,
    parsedSearchParams.data.search,
    parsedSearchParams.data.projectId,
    parsedSearchParams.data.workspaceId,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response as manifestApiTypes.GetManifestsResponse;
});

// Get manifest details
router.get("/:manifestId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    manifestId: z.number().int().min(1),
  });

  const parsedParams = paramSchema.safeParse({
    manifestId: Number(ctx.params.manifestId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const response = await manifestService.getManifestDetails(
    session.userId,
    parsedParams.data.manifestId,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response as manifestApiTypes.GetManifestDetailsResponse;
});

// Delete a manifest
router.delete("/:manifestId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    manifestId: z.number().int().min(1),
  });

  const parsedParams = paramSchema.safeParse({
    manifestId: Number(ctx.params.manifestId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await manifestService.deleteManifest(
    session.userId,
    parsedParams.data.manifestId,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.NoContent;
});

// Get manifest audit for a manifest
router.get("/:manifestId/audit", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    manifestId: z.number().int().min(1),
  });

  const parsedParams = paramSchema.safeParse({
    manifestId: Number(ctx.params.manifestId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const response = await manifestService.getManifestAudit(
    session.userId,
    parsedParams.data.manifestId,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response as manifestApiTypes.GetManifestAuditResponse;
});

// Smart filtering for a manifest
router.post("/:manifestId/smart-filter", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const smartFilterPayloadSchema = z.object({
    prompt: z.string(),
  });

  const parsedBody = smartFilterPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const paramSchema = z.object({
    manifestId: z.number().int(),
  });

  const parsedParams = paramSchema.safeParse({
    manifestId: Number(ctx.params.manifestId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const response = await manifestService.smartFilter(
    session.userId,
    parsedParams.data.manifestId,
    parsedBody.data,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response;
});

export default router;
