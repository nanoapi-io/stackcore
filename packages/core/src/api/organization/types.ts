import { z } from "zod";
import type { OrganizationMemberRole } from "../../db/models/organizationMember.ts";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../../db/models/organization.ts";

export const createOrganizationPayloadSchema = z.object({
  name: z.string(),
});
export type CreateOrganizationPayload = z.infer<
  typeof createOrganizationPayloadSchema
>;

export type GetOrganizationsResponse = {
  results: {
    id: number;
    name: string;
    isTeam: boolean;
    role: OrganizationMemberRole | null;
    stripe_product: StripeProduct | null;
    stripe_billing_cycle: StripeBillingCycle | null;
  }[];
  total: number;
};

export const updateOrganizationSchema = z.object({
  name: z.string(),
});
export type UpdateOrganizationPayload = z.infer<
  typeof updateOrganizationSchema
>;
