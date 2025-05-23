import { Router, Status } from "@oak/oak";
import { ProjectService } from "./service.ts";
import { authMiddleware, getSession } from "../auth/middleware.ts";
import { createProjectPayloadSchema, updateProjectSchema } from "./types.ts";
import z from "zod";

const projectService = new ProjectService();
const router = new Router();

// Create a new project
router.post("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const parsedBody = createProjectPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const { error } = await projectService.createProject(
    session.userId,
    parsedBody.data.name,
    parsedBody.data.organizationId,
    parsedBody.data.provider,
    parsedBody.data.providerId,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.Created;
  ctx.response.body = { message: "Project created successfully" };
});

// Get all projects for an organization
router.get("/", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const searchParamsSchema = z.object({
    search: z.string().optional(),
    organizationId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Organization ID must be a number",
    }).transform((val) => Number(val)).optional(),
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

  const response = await projectService.getProjects(
    session.userId,
    parsedSearchParams.data.page,
    parsedSearchParams.data.limit,
    parsedSearchParams.data.search,
    parsedSearchParams.data.organizationId,
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

// Update a project
router.patch("/:projectId", authMiddleware, async (ctx) => {
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

  const body = await ctx.request.body.json();

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
      provider: parsedBody.data.provider,
      providerId: parsedBody.data.providerId,
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
