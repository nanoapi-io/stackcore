import { z } from "zod";
import settings from "@stackcore/settings";
import type { StripeBillingCycle, StripeProduct } from "../../stripe/index.ts";

export type SubscriptionDetails = {
  currentUsage: number;
  product: StripeProduct;
  billingCycle: StripeBillingCycle | null;
  hasDefaultPaymentMethod: boolean;
  cancelAt: Date | null;
  newProductWhenCanceled: StripeProduct | null;
  newBillingCycleWhenCanceled: StripeBillingCycle | null;
};

export function prepareGetSubscription(
  workspaceId: number,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", workspaceId.toString());

  return {
    url: `/billing/subscription?${searchParams.toString()}`,
    method: "GET",
  };
}

export const upgradeSubscriptionRequestSchema = z.object({
  workspaceId: z.number(),
  product: z.enum([
    settings.STRIPE.PRODUCTS.BASIC.NAME,
    settings.STRIPE.PRODUCTS.PRO.NAME,
    settings.STRIPE.PRODUCTS.PREMIUM.NAME,
  ]),
  billingCycle: z.enum([
    settings.STRIPE.MONTHLY_BILLING_CYCLE,
    settings.STRIPE.YEARLY_BILLING_CYCLE,
  ]),
});

export type UpgradeSubscriptionRequest = z.infer<
  typeof upgradeSubscriptionRequestSchema
>;

export function prepareUpgradeSubscription(
  payload: UpgradeSubscriptionRequest,
) {
  return {
    url: "/billing/subscription/upgrade",
    method: "POST",
    body: payload,
  };
}

export const downgradeSubscriptionRequestSchema = z.object({
  workspaceId: z.number(),
  product: z.enum([
    settings.STRIPE.PRODUCTS.BASIC.NAME,
    settings.STRIPE.PRODUCTS.PRO.NAME,
    settings.STRIPE.PRODUCTS.PREMIUM.NAME,
  ]),
  billingCycle: z.enum([
    settings.STRIPE.MONTHLY_BILLING_CYCLE,
    settings.STRIPE.YEARLY_BILLING_CYCLE,
  ]),
});

export type DowngradeSubscriptionRequest = z.infer<
  typeof downgradeSubscriptionRequestSchema
>;

export function prepareDowngradeSubscription(
  payload: DowngradeSubscriptionRequest,
) {
  return {
    url: "/billing/subscription/downgrade",
    method: "POST",
    body: payload,
  };
}

export const createPortalSessionRequestSchema = z.object({
  workspaceId: z.number(),
  returnUrl: z.string(),
});

export type CreatePortalSessionRequest = z.infer<
  typeof createPortalSessionRequestSchema
>;

export type CreatePortalSessionResponse = {
  url: string;
};

export function prepareCreatePortalSession(
  payload: CreatePortalSessionRequest,
) {
  return {
    url: "/billing/portal",
    method: "POST",
    body: payload,
  };
}

export function prepareCreatePortalSessionPaymentMethod(
  payload: CreatePortalSessionRequest,
) {
  return {
    url: "/billing/portal/paymentMethod",
    method: "POST",
    body: payload,
  };
}
