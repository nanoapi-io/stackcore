import { z } from "zod";
import type { Project } from "../../db/models/project.ts";

export const createProjectPayloadSchema = z.object({
  name: z.string(),
  workspaceId: z.number(),
  provider: z.enum(["github", "gitlab"]).nullable(),
  providerId: z.string().nullable(),
});

export type CreateProjectPayload = z.infer<
  typeof createProjectPayloadSchema
>;

export function prepareCreateProject(payload: CreateProjectPayload) {
  return {
    url: "/projects",
    method: "POST",
    body: payload,
  };
}

export function prepareGetProjects(payload: {
  page: number;
  limit: number;
  search?: string;
  workspaceId?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }
  if (payload.workspaceId) {
    searchParams.set("workspaceId", payload.workspaceId.toString());
  }

  return {
    url: `/projects?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
  };
}

export const updateProjectSchema = z.object({
  name: z.string().optional(),
  provider: z.enum(["github", "gitlab"]).optional().nullable(),
  providerId: z.string().optional().nullable(),
});

export type UpdateProjectPayload = z.infer<
  typeof updateProjectSchema
>;

export function prepareUpdateProject(
  projectId: number,
  payload: UpdateProjectPayload,
) {
  return {
    url: `/projects/${projectId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeleteProject(projectId: number) {
  return {
    url: `/projects/${projectId}`,
    method: "DELETE",
    body: undefined,
  };
}

export type GetProjectsResponse = {
  results: Project[];
  total: number;
};
