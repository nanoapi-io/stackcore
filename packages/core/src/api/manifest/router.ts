import { Router, Status } from "@oak/oak";
import { ManifestService } from "./service.ts";
import { authMiddleware, getSession } from "../auth/middleware.ts";
import { createManifestPayloadSchema } from "./types.ts";
import z from "zod";

const manifestService = new ManifestService();
const router = new Router();

// Create a new manifest
router.post("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const parsedBody = createManifestPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const { manifestId, error } = await manifestService.createManifest(
    session.userId,
    parsedBody.data.projectId,
    parsedBody.data.branch,
    parsedBody.data.commitSha,
    parsedBody.data.commitShaDate,
    parsedBody.data.version,
    parsedBody.data.manifest,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.Created;
  ctx.response.body = {
    message: "Manifest created successfully",
    manifestId,
  };
});

// Get manifests with pagination and filtering
router.get("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const searchParamsSchema = z.object({
    search: z.string().optional(),
    projectId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Project ID must be a number",
    }).transform((val) => Number(val)).optional(),
    workspaceId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Workspace ID must be a number",
    }).transform((val) => Number(val)).optional(),
    page: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Page must be a number",
    }).transform((val) => Number(val)),
    limit: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Limit must be a number",
    }).transform((val) => Number(val)),
  });

  const searchParams = Object.fromEntries(ctx.request.url.searchParams);

  const parsedSearchParams = searchParamsSchema.safeParse(searchParams);

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

  if (response.error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = {
    results: response.results,
    total: response.total,
  };
});

// Get manifest details
router.get("/:manifestId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    manifestId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Manifest ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const response = await manifestService.getManifestDetails(
    session.userId,
    parsedParams.data.manifestId,
  );

  if (response.error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response.manifest;
});

// Delete a manifest
router.delete("/:manifestId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    manifestId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Manifest ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

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

export default router;
