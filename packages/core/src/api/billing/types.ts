import { z } from "zod";
import {
  BASIC_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  type StripeBillingCycle,
  type StripeProduct,
  YEARLY_BILLING_CYCLE,
} from "../../db/models/workspace.ts";

export type SubscriptionDetails = {
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
  product: z.enum([BASIC_PRODUCT, PRO_PRODUCT, PREMIUM_PRODUCT]),
  billingCycle: z.enum([MONTHLY_BILLING_CYCLE, YEARLY_BILLING_CYCLE]),
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
  product: z.enum([BASIC_PRODUCT, PRO_PRODUCT, PREMIUM_PRODUCT]),
  billingCycle: z.enum([MONTHLY_BILLING_CYCLE, YEARLY_BILLING_CYCLE]),
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
