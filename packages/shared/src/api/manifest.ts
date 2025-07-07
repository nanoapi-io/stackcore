import type { AuditManifest } from "../manifests/auditManifest.ts";

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
  method: string;
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
  method: string;
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
  };
}

export function prepareGetManifestDetails(
  manifestId: number,
): {
  url: string;
  method: string;
} {
  return {
    url: `/manifests/${manifestId}`,
    method: "GET",
  };
}

export function prepareDeleteManifest(
  manifestId: number,
): {
  url: string;
  method: string;
} {
  return {
    url: `/manifests/${manifestId}`,
    method: "DELETE",
  };
}

export type GetManifestsResponse = {
  results: {
    id: number;
    project_id: number;
    created_at: Date;
    branch: string | null;
    commitSha: string | null;
    commitShaDate: Date | null;
    version: number;
  }[];
  total: number;
};

export type GetManifestDetailsResponse = {
  id: number;
  project_id: number;
  created_at: Date;
  branch: string | null;
  commitSha: string | null;
  commitShaDate: Date | null;
  version: number;
  manifest: string;
};

export function prepareGetManifestAudit(
  manifestId: number,
): {
  url: string;
  method: string;
} {
  return {
    url: `/manifests/${manifestId}/audit`,
    method: "GET",
  };
}

export type GetManifestAuditResponse = AuditManifest;

export type SmartFilterPayload = {
  prompt: string;
};

export function prepareSmartFilter(
  manifestId: number,
  payload: SmartFilterPayload,
): {
  url: string;
  method: string;
  body: SmartFilterPayload;
} {
  return {
    url: `/manifests/${manifestId}/smart-filter`,
    method: "POST",
    body: payload,
  };
}

export type SmartFilterResponse = {
  success: boolean;
  message: string;
  results: {
    fileId: string;
    symbolId: string;
  }[];
};
