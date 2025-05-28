import { Router, Status } from "@oak/oak";
import { InvitationService } from "./service.ts";
import { authMiddleware } from "../auth/middleware.ts";
import { createInvitationSchema } from "./types.ts";
import z from "zod";

const invitationService = new InvitationService();
const router = new Router();

// Create invitation to join a workspace
router.post("/", authMiddleware, async (ctx) => {
  const body = await ctx.request.body.json();

  const parsedBody = createInvitationSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const { error } = await invitationService
    .createInvitation(
      ctx.state.session.userId,
      parsedBody.data.workspaceId,
      parsedBody.data.email,
      parsedBody.data.returnUrl,
    );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Invitation created successfully" };
});

// Claim an invitation to join a workspace
router.post("/:uuid/claim", authMiddleware, async (ctx) => {
  const paramSchema = z.object({
    uuid: z.string().uuid(),
  });

  const parsedParams = paramSchema.safeParse(ctx.params);

  if (!parsedParams.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedParams.error };
    return;
  }

  const { error } = await invitationService
    .claimInvitation(parsedParams.data.uuid, ctx.state.session.userId);

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Invitation claimed successfully" };
});

export default router;
