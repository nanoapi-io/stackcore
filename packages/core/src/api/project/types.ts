import { z } from "zod";
import type { Project } from "../../db/types.ts";

export const createProjectPayloadSchema = z.object({
  name: z.string(),
  organizationId: z.number(),
  provider: z.enum(["github", "gitlab"]).nullable(),
  providerId: z.string().nullable(),
});

export type CreateProjectPayload = z.infer<
  typeof createProjectPayloadSchema
>;

export type CreateProjectResponse = Project;

export type GetProjectsResponse = {
  results: Project[];
  total: number;
};

export const updateProjectSchema = z.object({
  name: z.string().optional(),
  provider: z.enum(["github", "gitlab"]).optional().nullable(),
  providerId: z.string().optional().nullable(),
});

export type UpdateProjectPayload = z.infer<
  typeof updateProjectSchema
>;
