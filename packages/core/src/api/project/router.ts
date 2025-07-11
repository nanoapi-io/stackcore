import { Router, Status } from "@oak/oak";
import { ProjectService } from "./service.ts";
import { authMiddleware, getSession } from "../auth/middleware.ts";
import type { projectApiTypes } from "@stackcore/shared";
import z from "zod";
import settings from "../../settings.ts";

const projectService = new ProjectService();
const router = new Router();

// Create a new project
router.post("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const createProjectPayloadSchema = z.object({
    name: z.string(),
    repoUrl: z.string(),
    workspaceId: z.number(),
    maxCodeCharPerSymbol: z.number().int().min(1),
    maxCodeCharPerFile: z.number().int().min(1),
    maxCharPerSymbol: z.number().int().min(1),
    maxCharPerFile: z.number().int().min(1),
    maxCodeLinePerSymbol: z.number().int().min(1),
    maxCodeLinePerFile: z.number().int().min(1),
    maxLinePerSymbol: z.number().int().min(1),
    maxLinePerFile: z.number().int().min(1),
    maxDependencyPerSymbol: z.number().int().min(1),
    maxDependencyPerFile: z.number().int().min(1),
    maxDependentPerSymbol: z.number().int().min(1),
    maxDependentPerFile: z.number().int().min(1),
    maxCyclomaticComplexityPerSymbol: z.number().int().min(1),
    maxCyclomaticComplexityPerFile: z.number().int().min(1),
  });

  const parsedBody = createProjectPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const response = await projectService.createProject(
    session.userId,
    {
      name: parsedBody.data.name,
      repoUrl: parsedBody.data.repoUrl,
      workspaceId: parsedBody.data.workspaceId,
      maxCodeCharPerSymbol: parsedBody.data.maxCodeCharPerSymbol,
      maxCodeCharPerFile: parsedBody.data.maxCodeCharPerFile,
      maxCharPerSymbol: parsedBody.data.maxCharPerSymbol,
      maxCharPerFile: parsedBody.data.maxCharPerFile,
      maxCodeLinePerSymbol: parsedBody.data.maxCodeLinePerSymbol,
      maxCodeLinePerFile: parsedBody.data.maxCodeLinePerFile,
      maxLinePerSymbol: parsedBody.data.maxLinePerSymbol,
      maxLinePerFile: parsedBody.data.maxLinePerFile,
      maxDependencyPerSymbol: parsedBody.data.maxDependencyPerSymbol,
      maxDependencyPerFile: parsedBody.data.maxDependencyPerFile,
      maxDependentPerSymbol: parsedBody.data.maxDependentPerSymbol,
      maxDependentPerFile: parsedBody.data.maxDependentPerFile,
      maxCyclomaticComplexityPerSymbol:
        parsedBody.data.maxCyclomaticComplexityPerSymbol,
      maxCyclomaticComplexityPerFile:
        parsedBody.data.maxCyclomaticComplexityPerFile,
    },
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.Created;
  ctx.response.body = response as projectApiTypes.CreateProjectResponse;
});

// Get all projects for an workspace
router.get("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const searchParamsSchema = z.object({
    search: z.string().optional(),
    workspaceId: z.number().int().min(1).optional(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(settings.PAGINATION.MAX_LIMIT),
  });

  const searchParams = Object.fromEntries(ctx.request.url.searchParams);

  const parsedSearchParams = searchParamsSchema.safeParse({
    ...searchParams,
    workspaceId: searchParams.workspaceId
      ? Number(searchParams.workspaceId)
      : undefined,
    page: Number(searchParams.page),
    limit: Number(searchParams.limit),
  });

  if (!parsedSearchParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedSearchParams.error };
    return;
  }

  const response = await projectService.getProjects(
    session.userId,
    parsedSearchParams.data.page,
    parsedSearchParams.data.limit,
    parsedSearchParams.data.search,
    parsedSearchParams.data.workspaceId,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response as projectApiTypes.GetProjectsResponse;
});

// Get project details
router.get("/:projectId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    projectId: z.number().int().min(1),
  });

  const parsedParams = paramSchema.safeParse({
    projectId: Number(ctx.params.projectId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const response = await projectService.getProjectDetails(
    session.userId,
    parsedParams.data.projectId,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response as projectApiTypes.GetProjectDetailsResponse;
});

// Update a project
router.patch("/:projectId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    projectId: z.number().int(),
  });

  const parsedParams = paramSchema.safeParse({
    projectId: Number(ctx.params.projectId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const body = await ctx.request.body.json();

  const updateProjectSchema = z.object({
    name: z.string(),
    repoUrl: z.string(),
    maxCodeCharPerSymbol: z.number().int().min(1),
    maxCodeCharPerFile: z.number().int().min(1),
    maxCharPerSymbol: z.number().int().min(1),
    maxCharPerFile: z.number().int().min(1),
    maxCodeLinePerSymbol: z.number().int().min(1),
    maxCodeLinePerFile: z.number().int().min(1),
    maxLinePerSymbol: z.number().int().min(1),
    maxLinePerFile: z.number().int().min(1),
    maxDependencyPerSymbol: z.number().int().min(1),
    maxDependencyPerFile: z.number().int().min(1),
    maxDependentPerSymbol: z.number().int().min(1),
    maxDependentPerFile: z.number().int().min(1),
    maxCyclomaticComplexityPerSymbol: z.number().int().min(1),
    maxCyclomaticComplexityPerFile: z.number().int().min(1),
  });

  const parsedBody = updateProjectSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const { error } = await projectService.updateProject(
    session.userId,
    parsedParams.data.projectId,
    {
      name: parsedBody.data.name,
      repoUrl: parsedBody.data.repoUrl,
      maxCodeCharPerSymbol: parsedBody.data.maxCodeCharPerSymbol,
      maxCodeCharPerFile: parsedBody.data.maxCodeCharPerFile,
      maxCharPerSymbol: parsedBody.data.maxCharPerSymbol,
      maxCharPerFile: parsedBody.data.maxCharPerFile,
      maxCodeLinePerSymbol: parsedBody.data.maxCodeLinePerSymbol,
      maxCodeLinePerFile: parsedBody.data.maxCodeLinePerFile,
      maxLinePerSymbol: parsedBody.data.maxLinePerSymbol,
      maxLinePerFile: parsedBody.data.maxLinePerFile,
      maxDependencyPerSymbol: parsedBody.data.maxDependencyPerSymbol,
      maxDependencyPerFile: parsedBody.data.maxDependencyPerFile,
      maxDependentPerSymbol: parsedBody.data.maxDependentPerSymbol,
      maxDependentPerFile: parsedBody.data.maxDependentPerFile,
      maxCyclomaticComplexityPerSymbol:
        parsedBody.data.maxCyclomaticComplexityPerSymbol,
      maxCyclomaticComplexityPerFile:
        parsedBody.data.maxCyclomaticComplexityPerFile,
    },
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Project updated successfully" };
});

// Delete a project
router.delete("/:projectId", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const paramSchema = z.object({
    projectId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Project ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await projectService.deleteProject(
    session.userId,
    parsedParams.data.projectId,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.NoContent;
});

export default router;
