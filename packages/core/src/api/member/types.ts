import { z } from "zod";
import type { OrganizationMemberRole } from "../../db/models/organizationMember.ts";

export type GetMembersResponse = {
  results: {
    id: number;
    user_id: number;
    email: string;
    role: OrganizationMemberRole | null;
  }[];
};

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});
export type UpdateMemberRolePayload = z.infer<typeof updateMemberRoleSchema>;
