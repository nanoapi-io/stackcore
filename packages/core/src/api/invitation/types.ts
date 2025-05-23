import { z } from "zod";

export const createInvitationSchema = z.object({
  organizationId: z.number(),
  email: z.string().email(),
});
export type CreateInvitationPayload = z.infer<typeof createInvitationSchema>;
