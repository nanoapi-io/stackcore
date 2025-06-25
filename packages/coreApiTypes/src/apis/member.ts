export const ADMIN_ROLE = "admin";
export const MEMBER_ROLE = "member";
export type MemberRole = typeof ADMIN_ROLE | typeof MEMBER_ROLE;

export function prepareGetMembers(payload: {
  workspaceId: number;
  page: number;
  limit: number;
  search?: string;
}): {
  url: string;
  method: "GET";
  body: undefined;
} {
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
  total: number;
};

export type UpdateMemberRolePayload = {
  role: MemberRole;
};

export function prepareUpdateMemberRole(
  memberId: number,
  payload: UpdateMemberRolePayload,
): {
  url: string;
  method: "PATCH";
  body: UpdateMemberRolePayload;
} {
  return {
    url: `/members/${memberId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeleteMember(
  memberId: number,
): {
  url: string;
  method: "DELETE";
  body: undefined;
} {
  return {
    url: `/members/${memberId}`,
    method: "DELETE",
    body: undefined,
  };
}
