import { z } from "zod";
import type { OrganizationMemberRole } from "../../db/models/organizationMember.ts";

export {
  ADMIN_ROLE,
  MEMBER_ROLE,
  type OrganizationMemberRole,
} from "../../db/models/organizationMember.ts";

export function prepareGetMembers(payload: {
  organizationId: number;
  page: number;
  limit: number;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("organizationId", payload.organizationId.toString());
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }

  return {
    url: `/members?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
  };
}

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

export function prepareUpdateMemberRole(
  memberId: number,
  payload: UpdateMemberRolePayload,
) {
  return {
    url: `/members/${memberId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeleteMember(memberId: number) {
  return {
    url: `/members/${memberId}`,
    method: "DELETE",
    body: undefined,
  };
}
