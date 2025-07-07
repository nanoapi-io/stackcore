export const BASIC_PRODUCT = "BASIC";
export const PRO_PRODUCT = "PRO";
export const PREMIUM_PRODUCT = "PREMIUM";
export const CUSTOM_PRODUCT = "CUSTOM";

export type StripeProduct =
  | typeof BASIC_PRODUCT
  | typeof PRO_PRODUCT
  | typeof PREMIUM_PRODUCT
  | typeof CUSTOM_PRODUCT;

export const MONTHLY_BILLING_CYCLE = "MONTHLY";
export const YEARLY_BILLING_CYCLE = "YEARLY";

export type StripeBillingCycle =
  | typeof MONTHLY_BILLING_CYCLE
  | typeof YEARLY_BILLING_CYCLE;
