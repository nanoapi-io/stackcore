import { Router, Status } from "@oak/oak";
import { MemberService } from "./service.ts";
import { authMiddleware } from "../auth/middleware.ts";
import { type GetMembersResponse, updateMemberRoleSchema } from "./types.ts";
import z from "zod";

const memberService = new MemberService();
const router = new Router();

// Get all members of a workspace
router.get("/", authMiddleware, async (ctx) => {
  const searchParamsSchema = z.object({
    workspaceId: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Workspace ID must be a number",
    }).transform((val) => Number(val)),
    search: z.string().optional(),
    page: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Page must be a number",
    }).transform((val) => parseInt(val)),
    limit: z.string().refine((val) => !isNaN(Number(val)), {
      message: "Limit must be a number",
    }).transform((val) => parseInt(val)),
  });

  const searchParams = Object.fromEntries(ctx.request.url.searchParams);

  const parsedSearchParams = searchParamsSchema.safeParse(searchParams);

  if (!parsedSearchParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedSearchParams.error };
    return;
  }

  const response = await memberService.getMembers(
    ctx.state.session.userId,
    parsedSearchParams.data.workspaceId,
    parsedSearchParams.data.page,
    parsedSearchParams.data.limit,
    parsedSearchParams.data.search,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response as GetMembersResponse;
});

router.patch(
  "/:memberId",
  authMiddleware,
  async (ctx) => {
    const paramSchema = z.object({
      memberId: z.string().refine((val) => !isNaN(Number(val)), {
        message: "Member ID must be a number",
      }).transform((val) => Number(val)),
    });

    const parsedParams = paramSchema.safeParse(ctx.params);

    if (!parsedParams.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: parsedParams.error };
      return;
    }

    const body = await ctx.request.body.json();

    const parsedBody = updateMemberRoleSchema.safeParse(body);

    if (!parsedBody.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: parsedBody.error };
      return;
    }

    const { error } = await memberService.updateMemberRole(
      ctx.state.session.userId,
      parsedParams.data.memberId,
      parsedBody.data.role,
    );

    if (error) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = { message: "Member role updated successfully" };
  },
);

// Remove a member from an workspace
router.delete(
  "/:memberId",
  authMiddleware,
  async (ctx) => {
    const paramSchema = z.object({
      memberId: z.string().refine((val) => !isNaN(Number(val)), {
        message: "Member ID must be a number",
      }).transform((val) => Number(val)),
    });

    const parsedParams = paramSchema.safeParse(ctx.params);

    if (!parsedParams.success) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error: parsedParams.error };
      return;
    }

    const { error } = await memberService.removeMemberFromWorkspace(
      ctx.state.session.userId,
      parsedParams.data.memberId,
    );

    if (error) {
      ctx.response.status = Status.BadRequest;
      ctx.response.body = { error };
      return;
    }

    ctx.response.status = Status.OK;
    ctx.response.body = {
      message: "Member removed from workspace successfully",
    };
  },
);

export default router;
