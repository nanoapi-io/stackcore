import { z } from "zod";
import type { Manifest } from "../../db/models/manifest.ts";

export const createManifestPayloadSchema = z.object({
  projectId: z.number(),
  branch: z.string().nullable(),
  commitSha: z.string().nullable(),
  commitShaDate: z.string().nullable().transform((val) =>
    val ? new Date(val) : null
  ),
  version: z.number(),
  manifest: z.object({}).passthrough(), // Allow any object structure
});

export type CreateManifestPayload = z.infer<
  typeof createManifestPayloadSchema
>;

export function prepareCreateManifest(payload: CreateManifestPayload) {
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
}) {
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

export function prepareGetManifestDetails(manifestId: number) {
  return {
    url: `/manifests/${manifestId}`,
    method: "GET",
    body: undefined,
  };
}

export function prepareDeleteManifest(manifestId: number) {
  return {
    url: `/manifests/${manifestId}`,
    method: "DELETE",
    body: undefined,
  };
}

export type GetManifestsResponse = {
  results: Omit<Manifest, "manifest">[]; // Only return metadata for list view
  total: number;
};

export type GetManifestDetailsResponse = Manifest; // Return full manifest details
