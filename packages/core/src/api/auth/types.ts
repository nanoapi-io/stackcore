import { z } from "zod";

export const requestOtpSchema = z.object({
  email: z.string().email(),
});
export type RequestOtpPayload = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
});
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;

export interface VerifyOtpResponse {
  token: string;
}

export interface CurrentUserResponse {
  email: string;
}

export interface Session {
  userId: number;
  email: string;
  expiresAt: Date;
}
