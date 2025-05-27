import { z } from "zod";

export const createInvitationSchema = z.object({
  workspaceId: z.number(),
  email: z.string().email(),
});
export type CreateInvitationPayload = z.infer<typeof createInvitationSchema>;

export function prepareCreateInvitation(payload: CreateInvitationPayload) {
  return {
    url: `/invitations`,
    method: "POST",
    body: payload,
  };
}

export function prepareClaimInvitation(invitationUuid: string) {
  return {
    url: `/invitations/${invitationUuid}/claim`,
    method: "POST",
    body: undefined,
  };
}
