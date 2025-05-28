import { Router, Status } from "@oak/oak";
import { WorkspaceService } from "./service.ts";
import { authMiddleware } from "../auth/middleware.ts";
import {
  createWorkspacePayloadSchema,
  type CreateWorkspaceResponse,
  type GetWorkspacesResponse,
  updateWorkspaceSchema,
} from "./types.ts";
import z from "zod";
import settings from "../../settings.ts";

const workspaceService = new WorkspaceService();
const router = new Router();

// Create a new team workspace for the current user
router.post("/", authMiddleware, async (ctx) => {
  const body = await ctx.request.body.json();

  const parsedBody = createWorkspacePayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const userId = ctx.state.session.userId;
  const result = await workspaceService
    .createTeamWorkspace(
      parsedBody.data.name,
      userId,
    );

  if ("error" in result) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: result.error };
    return;
  }

  ctx.response.status = Status.Created;
  ctx.response.body = result as CreateWorkspaceResponse;
});

// Get all workspaces for current user
router.get("/", authMiddleware, async (ctx) => {
  const userId = ctx.state.session.userId;

  const searchParamsSchema = z.object({
    search: z.string().optional(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(settings.PAGINATION.MAX_LIMIT),
  });

  const searchParams = Object.fromEntries(ctx.request.url.searchParams);

  const parsedSearchParams = searchParamsSchema.safeParse({
    ...searchParams,
    page: Number(searchParams.page),
    limit: Number(searchParams.limit),
  });

  if (!parsedSearchParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedSearchParams.error };
    return;
  }

  const response: GetWorkspacesResponse = await workspaceService
    .getWorkspaces(
      userId,
      parsedSearchParams.data.page,
      parsedSearchParams.data.limit,
      parsedSearchParams.data.search,
    );

  ctx.response.status = Status.OK;
  ctx.response.body = response;
});

// Update a workspace
router.patch("/:workspaceId", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    workspaceId: z.number().int().min(1),
  });

  const parsedParams = paramSchema.safeParse({
    workspaceId: Number(ctx.params.workspaceId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const body = await ctx.request.body.json();

  const parsedBody = updateWorkspaceSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const { error } = await workspaceService.updateWorkspace(
    ctx.state.session.userId,
    parsedParams.data.workspaceId,
    parsedBody.data.name,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Workspace updated successfully" };
});

// Deactivate an workspace
router.post("/:workspaceId/deactivate", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    workspaceId: z.number().int().min(1),
  });

  const parsedParams = paramSchema.safeParse({
    workspaceId: Number(ctx.params.workspaceId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await workspaceService.deactivateWorkspace(
    ctx.state.session.userId,
    parsedParams.data.workspaceId,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.NoContent;
});
export default router;
