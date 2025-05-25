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

export function prepareRequestOtp(payload: RequestOtpPayload) {
  return {
    url: "/auth/requestOtp",
    method: "POST",
    body: payload,
  };
}

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
});
export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;

export function prepareVerifyOtp(payload: VerifyOtpPayload) {
  return {
    url: "/auth/verifyOtp",
    method: "POST",
    body: payload,
  };
}

export type VerifyOtpResponse = {
  token: string;
};

export function prepareMe() {
  return {
    url: "/auth/me",
    method: "GET",
    body: undefined,
  };
}
