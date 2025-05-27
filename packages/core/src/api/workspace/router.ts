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
    page: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Page must be a number",
    }).transform((val) => parseInt(val)),
    limit: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Limit must be a number",
    }).transform((val) => parseInt(val)),
  });

  const searchParams = Object.fromEntries(ctx.request.url.searchParams);

  const parsedSearchParams = searchParamsSchema.safeParse(
    searchParams,
  );

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
    workspaceId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Workspace ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

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

// Delete an workspace
router.delete("/:workspaceId", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    workspaceId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Workspace ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await workspaceService.deleteWorkspace(
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
