import { Router, Status } from "@oak/oak";
import { OrganizationService } from "./service.ts";
import { authMiddleware } from "../auth/middleware.ts";
import {
  createOrganizationPayloadSchema,
  type GetOrganizationsResponse,
  updateOrganizationSchema,
} from "./types.ts";
import z from "zod";

const organizationService = new OrganizationService();
const router = new Router();

// Create a new team organization for the current user
router.post("/", authMiddleware, async (ctx) => {
  const body = await ctx.request.body.json();

  const parsedBody = createOrganizationPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const userId = ctx.state.session.userId;
  const { error } = await organizationService
    .createTeamOrganization(
      parsedBody.data.name,
      userId,
    );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.Created;
  ctx.response.body = { message: "Team organization created successfully" };
});

// Get all organizations for current user
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

  const response: GetOrganizationsResponse = await organizationService
    .getOrganizations(
      userId,
      parsedSearchParams.data.page,
      parsedSearchParams.data.limit,
      parsedSearchParams.data.search,
    );

  ctx.response.status = Status.OK;
  ctx.response.body = response;
});

// Update a organization
router.patch("/:organizationId", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    organizationId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Organization ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const body = await ctx.request.body.json();

  const parsedBody = updateOrganizationSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const { error } = await organizationService.updateOrganization(
    ctx.state.session.userId,
    parsedParams.data.organizationId,
    parsedBody.data.name,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Organization updated successfully" };
});

// Delete an organization
router.delete("/:organizationId", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    organizationId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Organization ID must be a number",
    }).transform((val) => Number(val)),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await organizationService.deleteOrganization(
    ctx.state.session.userId,
    parsedParams.data.organizationId,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.NoContent;
});
export default router;
