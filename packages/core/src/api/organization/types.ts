import { z } from "zod";
import type { Organization } from "../../db/types.ts";

export const createOrganizationPayloadSchema = z.object({
  name: z.string(),
});

export type CreateOrganizationPayload = z.infer<
  typeof createOrganizationPayloadSchema
>;

export type CreateOrganizationResponse = Organization;

export const createInvitationSchema = z.object({
  email: z.string().email(),
});

export const updateOrganizationSchema = z.object({
  name: z.string(),
});

export type UpdateOrganizationPayload = z.infer<
  typeof updateOrganizationSchema
>;

export type CreateInvitationPayload = z.infer<typeof createInvitationSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export type UpdateMemberRolePayload = z.infer<typeof updateMemberRoleSchema>;

export type GetMembersResponse = {
  results: {
    id: number;
    email: string;
    role: string;
  }[];
  total: number;
};
