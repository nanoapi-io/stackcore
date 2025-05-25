import { z } from "zod";
import type { OrganizationMemberRole } from "../../db/models/organizationMember.ts";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../../db/models/organization.ts";

export {
  BASIC_PRODUCT,
  CUSTOM_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  type StripeBillingCycle,
  type StripeProduct,
  YEARLY_BILLING_CYCLE,
} from "../../db/models/organization.ts";

export const createOrganizationPayloadSchema = z.object({
  name: z.string(),
});
export type CreateOrganizationPayload = z.infer<
  typeof createOrganizationPayloadSchema
>;

export type CreateOrganizationResponse = {
  id: number;
};

export function prepareCreateOrganization(payload: CreateOrganizationPayload) {
  return {
    url: "/organizations",
    method: "POST",
    body: payload,
  };
}

export function prepareGetOrganizations(payload: {
  page: number;
  limit: number;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }

  return {
    url: `/organizations?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
  };
}

export type GetOrganizationsResponse = {
  results: {
    id: number;
    name: string;
    isTeam: boolean;
    role: OrganizationMemberRole | null;
    stripe_product: StripeProduct | null;
    stripe_billing_cycle: StripeBillingCycle | null;
    access_enabled: boolean;
  }[];
  total: number;
};

export const updateOrganizationSchema = z.object({
  name: z.string(),
});
export type UpdateOrganizationPayload = z.infer<
  typeof updateOrganizationSchema
>;

export function prepareUpdateOrganization(
  organizationId: number,
  payload: UpdateOrganizationPayload,
) {
  return {
    url: `/organizations/${organizationId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeleteOrganization(organizationId: number) {
  return {
    url: `/organizations/${organizationId}`,
    method: "DELETE",
    body: undefined,
  };
}
