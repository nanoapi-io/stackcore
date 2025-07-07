export const BASIC_PRODUCT = "basic";
export const PRO_PRODUCT = "pro";
export const PREMIUM_PRODUCT = "premium";
export const CUSTOM_PRODUCT = "custom";

export type StripeProduct =
  | typeof BASIC_PRODUCT
  | typeof PRO_PRODUCT
  | typeof PREMIUM_PRODUCT
  | typeof CUSTOM_PRODUCT;

export const MONTHLY_BILLING_CYCLE = "monthly";
export const YEARLY_BILLING_CYCLE = "yearly";

export type StripeBillingCycle =
  | typeof MONTHLY_BILLING_CYCLE
  | typeof YEARLY_BILLING_CYCLE;
