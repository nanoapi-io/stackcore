import { z } from "zod";

export const createOrganizationPayloadSchema = z.object({
  name: z.string(),
});
export type CreateOrganizationPayload = z.infer<
  typeof createOrganizationPayloadSchema
>;

export const createInvitationSchema = z.object({
  email: z.string().email(),
});
export type CreateInvitationPayload = z.infer<typeof createInvitationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string(),
});
export type UpdateOrganizationPayload = z.infer<
  typeof updateOrganizationSchema
>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
export type UpdateMemberRolePayload = z.infer<typeof updateMemberRoleSchema>;
