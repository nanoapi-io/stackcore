import { Router, Status } from "@oak/oak";
import {
  createPortalSessionRequestSchema,
  type CreatePortalSessionResponse,
} from "./types.ts";
import { BillingService } from "./service.ts";

const router = new Router();

router.post("/portal", async (ctx) => {
  const body = await ctx.request.body.json();

  const parsedBody = createPortalSessionRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const billingService = new BillingService();
  const { url, error } = await billingService.createBillingPortalSession(
    ctx.state.session.userId,
    parsedBody.data.organizationId,
    parsedBody.data.returnUrl,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  if (!url) {
    throw new Error("No URL");
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { url } as CreatePortalSessionResponse;
});

router.post("/webhook", async (ctx) => {
  const billingService = new BillingService();
  const { status, body } = await billingService.handleWebhook(ctx.request.body);

  ctx.response.status = status;
  ctx.response.body = body;
});

export default router;
