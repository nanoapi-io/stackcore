export type CreateInvitationPayload = {
  workspaceId: number;
  email: string;
  returnUrl: string;
};

export function prepareCreateInvitation(
  payload: CreateInvitationPayload,
): {
  url: string;
  method: string;
  body: CreateInvitationPayload;
} {
  return {
    url: `/invitations`,
    method: "POST",
    body: payload,
  };
}

export function prepareClaimInvitation(
  invitationUuid: string,
): {
  url: string;
  method: string;
} {
  return {
    url: `/invitations/${invitationUuid}/claim`,
    method: "POST",
  };
}
