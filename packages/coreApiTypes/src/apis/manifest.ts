import type { AuditManifest } from "@stackcore/manifests";

export type CreateManifestPayload = {
  projectId: number;
  branch: string | null;
  commitSha: string | null;
  commitShaDate: Date | null;
  manifest: Record<string, unknown>;
};

export type CreateManifestResponse = {
  id: number;
};

export function prepareCreateManifest(
  payload: CreateManifestPayload,
): {
  url: string;
  method: "POST";
  body: CreateManifestPayload;
} {
  return {
    url: "/manifests",
    method: "POST",
    body: payload,
  };
}

export function prepareGetManifests(payload: {
  page: number;
  limit: number;
  search?: string;
  projectId?: number;
  workspaceId?: number;
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
  if (payload.projectId) {
    searchParams.set("projectId", payload.projectId.toString());
  }
  if (payload.workspaceId) {
    searchParams.set("workspaceId", payload.workspaceId.toString());
  }

  return {
    url: `/manifests?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
  };
}

export function prepareGetManifestDetails(
  manifestId: number,
): {
  url: string;
  method: "GET";
  body: undefined;
} {
  return {
    url: `/manifests/${manifestId}`,
    method: "GET",
    body: undefined,
  };
}

export function prepareDeleteManifest(
  manifestId: number,
): {
  url: string;
  method: "DELETE";
  body: undefined;
} {
  return {
    url: `/manifests/${manifestId}`,
    method: "DELETE",
    body: undefined,
  };
}

export type GetManifestsResponse = {
  results: {
    id: number;
    project_id: number;
    branch: string | null;
    commitSha: string | null;
    commitShaDate: Date | null;
    version: number;
    created_at: Date;
  }[];
  total: number;
};

export type GetManifestDetailsResponse = {
  id: number;
  project_id: number;
  branch: string | null;
  commitSha: string | null;
  commitShaDate: Date | null;
  version: number;
  manifest: string;
  created_at: Date;
};

export function prepareGetManifestAudit(
  manifestId: number,
): {
  url: string;
  method: "GET";
  body: undefined;
} {
  return {
    url: `/manifests/${manifestId}/audit`,
    method: "GET",
    body: undefined,
  };
}

export type GetManifestAuditResponse = AuditManifest;
