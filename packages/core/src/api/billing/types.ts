import { z } from "zod";
import {
  BASIC_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  YEARLY_BILLING_CYCLE,
} from "../../db/models/organization.ts";

export const upgradeSubscriptionRequestSchema = z.object({
  organizationId: z.number(),
  product: z.enum([PREMIUM_PRODUCT, PRO_PRODUCT]),
  billingCycle: z.enum([MONTHLY_BILLING_CYCLE, YEARLY_BILLING_CYCLE]),
});

export type UpgradeSubscriptionRequest = z.infer<
  typeof upgradeSubscriptionRequestSchema
>;

export const downgradeSubscriptionRequestSchema = z.object({
  organizationId: z.number(),
  product: z.enum([BASIC_PRODUCT, PRO_PRODUCT]),
  billingCycle: z.enum([MONTHLY_BILLING_CYCLE, YEARLY_BILLING_CYCLE]),
});

export type DowngradeSubscriptionRequest = z.infer<
  typeof downgradeSubscriptionRequestSchema
>;

export const createPortalSessionRequestSchema = z.object({
  organizationId: z.number(),
  returnUrl: z.string(),
});

export type CreatePortalSessionRequest = z.infer<
  typeof createPortalSessionRequestSchema
>;
