export const STRIPE_MONTHLY_BILLING_CYCLE = "MONTHLY";
export const STRIPE_YEARLY_BILLING_CYCLE = "YEARLY";

export type StripeBillingCycle =
  | typeof STRIPE_MONTHLY_BILLING_CYCLE
  | typeof STRIPE_YEARLY_BILLING_CYCLE;

export const STRIPE_BASIC_PRODUCT = "BASIC";
export const STRIPE_PRO_PRODUCT = "PRO";
export const STRIPE_PREMIUM_PRODUCT = "PREMIUM";
export const STRIPE_CUSTOM_PRODUCT = "CUSTOM";

export type StripeProduct =
  | typeof STRIPE_BASIC_PRODUCT
  | typeof STRIPE_PRO_PRODUCT
  | typeof STRIPE_PREMIUM_PRODUCT
  | typeof STRIPE_CUSTOM_PRODUCT;

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
  method: "GET";
  body: undefined;
} {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", workspaceId.toString());

  return {
    url: `/billing/subscription?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
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
  method: "POST";
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
  method: "POST";
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
  method: "POST";
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
  method: "POST";
  body: CreatePortalSessionRequest;
} {
  return {
    url: "/billing/portal/paymentMethod",
    method: "POST",
    body: payload,
  };
}
