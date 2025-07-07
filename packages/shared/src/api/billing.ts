import type { StripeBillingCycle, StripeProduct } from "../stripe.ts";

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
): {
  url: string;
  method: string;
} {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", workspaceId.toString());

  return {
    url: `/billing/subscription?${searchParams.toString()}`,
    method: "GET",
  };
}

export type UpgradeSubscriptionRequest = {
  workspaceId: number;
  product: StripeProduct;
  billingCycle: StripeBillingCycle;
};

export function prepareUpgradeSubscription(
  payload: UpgradeSubscriptionRequest,
): {
  url: string;
  method: string;
  body: UpgradeSubscriptionRequest;
} {
  return {
    url: "/billing/subscription/upgrade",
    method: "POST",
    body: payload,
  };
}

export type DowngradeSubscriptionRequest = {
  workspaceId: number;
  product: StripeProduct;
  billingCycle: StripeBillingCycle;
};

export function prepareDowngradeSubscription(
  payload: DowngradeSubscriptionRequest,
): {
  url: string;
  method: string;
  body: DowngradeSubscriptionRequest;
} {
  return {
    url: "/billing/subscription/downgrade",
    method: "POST",
    body: payload,
  };
}

export type CreatePortalSessionRequest = {
  workspaceId: number;
  returnUrl: string;
};

export type CreatePortalSessionResponse = {
  url: string;
};

export function prepareCreatePortalSession(
  payload: CreatePortalSessionRequest,
): {
  url: string;
  method: string;
  body: CreatePortalSessionRequest;
} {
  return {
    url: "/billing/portal",
    method: "POST",
    body: payload,
  };
}

export function prepareCreatePortalSessionPaymentMethod(
  payload: CreatePortalSessionRequest,
): {
  url: string;
  method: string;
  body: CreatePortalSessionRequest;
} {
  return {
    url: "/billing/portal/paymentMethod",
    method: "POST",
    body: payload,
  };
}
