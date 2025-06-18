import { z } from "zod";
import type { Project } from "../../db/models/project.ts";

export const createProjectPayloadSchema = z.object({
  name: z.string(),
  repoUrl: z.string(),
  workspaceId: z.number(),
  maxCodeCharPerSymbol: z.number().int().min(1),
  maxCodeCharPerFile: z.number().int().min(1),
  maxCharPerSymbol: z.number().int().min(1),
  maxCharPerFile: z.number().int().min(1),
  maxCodeLinePerSymbol: z.number().int().min(1),
  maxCodeLinePerFile: z.number().int().min(1),
  maxLinePerSymbol: z.number().int().min(1),
  maxLinePerFile: z.number().int().min(1),
  maxDependencyPerSymbol: z.number().int().min(1),
  maxDependencyPerFile: z.number().int().min(1),
  maxDependentPerSymbol: z.number().int().min(1),
  maxDependentPerFile: z.number().int().min(1),
  maxCyclomaticComplexityPerSymbol: z.number().int().min(1),
  maxCyclomaticComplexityPerFile: z.number().int().min(1),
});

export type CreateProjectPayload = z.infer<
  typeof createProjectPayloadSchema
>;

export type CreateProjectResponse = {
  id: number;
};

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

export function prepareGetProjectDetails(projectId: number) {
  return {
    url: `/projects/${projectId}`,
    method: "GET",
    body: undefined,
  };
}

export const updateProjectSchema = z.object({
  name: z.string(),
  repoUrl: z.string(),
  maxCodeCharPerSymbol: z.number().int().min(1),
  maxCodeCharPerFile: z.number().int().min(1),
  maxCharPerSymbol: z.number().int().min(1),
  maxCharPerFile: z.number().int().min(1),
  maxCodeLinePerSymbol: z.number().int().min(1),
  maxCodeLinePerFile: z.number().int().min(1),
  maxLinePerSymbol: z.number().int().min(1),
  maxLinePerFile: z.number().int().min(1),
  maxDependencyPerSymbol: z.number().int().min(1),
  maxDependencyPerFile: z.number().int().min(1),
  maxDependentPerSymbol: z.number().int().min(1),
  maxDependentPerFile: z.number().int().min(1),
  maxCyclomaticComplexityPerSymbol: z.number().int().min(1),
  maxCyclomaticComplexityPerFile: z.number().int().min(1),
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

export type GetProjectDetailsResponse = Project;
