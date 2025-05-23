import { z } from "zod";

export const sessionSchema = z.object({
  userId: z.number(),
  email: z.string(),
});
export type Session = z.infer<typeof sessionSchema>;

export const requestOtpSchema = z.object({
  email: z.string().email(),
});
export type RequestOtpPayload = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
});
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;

export type VerifyOtpResponse = {
  token: string;
};
