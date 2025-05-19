import { z } from "zod";

export const createPortalSessionRequestSchema = z.object({
  organizationId: z.number(),
  returnUrl: z.string(),
});

export interface CreatePortalSessionResponse {
  url: string;
}
