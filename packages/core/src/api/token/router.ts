import { Router, Status } from "@oak/oak";
import { TokenService } from "./service.ts";
import { authMiddleware } from "../auth/middleware.ts";
import z from "zod";
import settings from "../../settings.ts";

const tokenService = new TokenService();
const router = new Router();

// Create a new token
router.post("/", authMiddleware, async (ctx) => {
  const body = await ctx.request.body.json();

  const createTokenSchema = z.object({
    name: z.string().nonempty(),
  });

  const parsedBody = createTokenSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const response = await tokenService.createToken(
    ctx.state.session.userId,
    parsedBody.data.name,
  );

  ctx.response.status = Status.Created;
  ctx.response.body = response;
});

// Get all tokens for the authenticated user
router.get("/", authMiddleware, async (ctx) => {
  const searchParamsSchema = z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(settings.PAGINATION.MAX_LIMIT),
    search: z.string().optional(),
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

  const response = await tokenService.getTokens(
    ctx.state.session.userId,
    parsedSearchParams.data.page,
    parsedSearchParams.data.limit,
    parsedSearchParams.data.search,
  );

  ctx.response.status = Status.OK;
  ctx.response.body = response;
});

// Delete a token
router.delete("/:tokenId", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    tokenId: z.number().int(),
  });

  const parsedParams = paramSchema.safeParse({
    tokenId: Number(ctx.params.tokenId),
  });

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await tokenService.deleteToken(
    ctx.state.session.userId,
    parsedParams.data.tokenId,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Token deleted successfully" };
});

export default router;
