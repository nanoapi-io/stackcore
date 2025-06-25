import { z } from "zod";
import type { MemberRole } from "@stackcore/db";
import settings from "@stackcore/settings";

export {
  type StripeBillingCycle,
  type StripeProduct,
} from "../../stripe/index.ts";

export const BASIC_PRODUCT = settings.STRIPE.PRODUCTS.BASIC.NAME;
export const PRO_PRODUCT = settings.STRIPE.PRODUCTS.PRO.NAME;
export const PREMIUM_PRODUCT = settings.STRIPE.PRODUCTS.PREMIUM.NAME;
export const CUSTOM_PRODUCT = settings.STRIPE.PRODUCTS.CUSTOM.NAME;

export const MONTHLY_BILLING_CYCLE = settings.STRIPE.MONTHLY_BILLING_CYCLE;
export const YEARLY_BILLING_CYCLE = settings.STRIPE.YEARLY_BILLING_CYCLE;

export const createWorkspacePayloadSchema = z.object({
  name: z.string(),
});
export type CreateWorkspacePayload = z.infer<
  typeof createWorkspacePayloadSchema
>;

export type CreateWorkspaceResponse = {
  id: number;
};

export function prepareCreateWorkspace(payload: CreateWorkspacePayload) {
  return {
    url: "/workspaces",
    method: "POST",
    body: payload,
  };
}

export function prepareGetWorkspaces(payload: {
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
    url: `/workspaces?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
  };
}

export type GetWorkspacesResponse = {
  results: {
    id: number;
    name: string;
    isTeam: boolean;
    role: MemberRole | null;
    access_enabled: boolean;
  }[];
  total: number;
};

export const updateWorkspaceSchema = z.object({
  name: z.string(),
});
export type UpdateWorkspacePayload = z.infer<
  typeof updateWorkspaceSchema
>;

export function prepareUpdateWorkspace(
  workspaceId: number,
  payload: UpdateWorkspacePayload,
) {
  return {
    url: `/workspaces/${workspaceId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeactivateWorkspace(workspaceId: number) {
  return {
    url: `/workspaces/${workspaceId}/deactivate`,
    method: "POST",
    body: undefined,
  };
}
