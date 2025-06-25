import type { MemberRole } from "./member.ts";

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
  method: "POST";
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
  method: "GET";
  body: undefined;
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

export type UpdateWorkspacePayload = {
  name: string;
};

export function prepareUpdateWorkspace(
  workspaceId: number,
  payload: UpdateWorkspacePayload,
): {
  url: string;
  method: "PATCH";
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
  method: "POST";
  body: undefined;
} {
  return {
    url: `/workspaces/${workspaceId}/deactivate`,
    method: "POST",
    body: undefined,
  };
}
