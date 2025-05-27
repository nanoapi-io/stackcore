import { z } from "zod";
import type { MemberRole } from "../../db/models/member.ts";

export {
  ADMIN_ROLE,
  MEMBER_ROLE,
  type MemberRole,
} from "../../db/models/member.ts";

export function prepareGetMembers(payload: {
  workspaceId: number;
  page: number;
  limit: number;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("workspaceId", payload.workspaceId.toString());
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
    role: MemberRole | null;
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
