import { Router, Status } from "@oak/oak";
import {
  createPortalSessionRequestSchema,
  downgradeSubscriptionRequestSchema,
  upgradeSubscriptionRequestSchema,
} from "./types.ts";
import { BillingService } from "./service.ts";
import { authMiddleware, getSession } from "../auth/middleware.ts";
const router = new Router();

router.post("/subscription/upgrade", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const parsedBody = upgradeSubscriptionRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const billingService = new BillingService();
  const { error } = await billingService.upgradeSubscription(
    session.userId,
    parsedBody.data.organizationId,
    parsedBody.data.product,
    parsedBody.data.billingCycle,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Subscription upgraded" };
});

router.post("/subscription/downgrade", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const parsedBody = downgradeSubscriptionRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const billingService = new BillingService();
  const { error } = await billingService.downgradeSubscription(
    session.userId,
    parsedBody.data.organizationId,
    parsedBody.data.product,
    parsedBody.data.billingCycle,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "Subscription downgraded" };
});

router.post("/portal/paymentMethod", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const parsedBody = createPortalSessionRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const billingService = new BillingService();
  const { url, error } = await billingService.updatePaymentMethod(
    session.userId,
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
  ctx.response.body = { url };
});

router.post("/webhook", async (ctx) => {
  const billingService = new BillingService();
  const { status, body } = await billingService.handleWebhook(ctx);

  ctx.response.status = status;
  ctx.response.body = body;
});

export default router;
