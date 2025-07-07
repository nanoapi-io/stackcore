import type { MemberRole } from "../member.ts";

export {
  BASIC_PRODUCT,
  CUSTOM_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  type StripeBillingCycle,
  type StripeProduct,
  YEARLY_BILLING_CYCLE,
} from "../stripe.ts";

export type CreateWorkspacePayload = {
  name: string;
};

export type CreateWorkspaceResponse = {
  id: number;
};

export function prepareCreateWorkspace(
  payload: CreateWorkspacePayload,
): {
  url: string;
  method: string;
  body: CreateWorkspacePayload;
} {
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
}): {
  url: string;
  method: string;
} {
  const searchParams = new URLSearchParams();
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }

  return {
    url: `/workspaces?${searchParams.toString()}`,
    method: "GET",
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

export type UpdateWorkspacePayload = {
  name: string;
};

export function prepareUpdateWorkspace(
  workspaceId: number,
  payload: UpdateWorkspacePayload,
): {
  url: string;
  method: string;
  body: UpdateWorkspacePayload;
} {
  return {
    url: `/workspaces/${workspaceId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeactivateWorkspace(
  workspaceId: number,
): {
  url: string;
  method: string;
} {
  return {
    url: `/workspaces/${workspaceId}/deactivate`,
    method: "POST",
  };
}
