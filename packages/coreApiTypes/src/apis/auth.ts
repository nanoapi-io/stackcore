export type Session = {
  userId: number;
  email: string;
};

export type RequestOtpPayload = {
  email: string;
};

export function prepareRequestOtp(payload: RequestOtpPayload): {
  url: string;
  method: "POST";
  body: RequestOtpPayload;
} {
  return {
    url: "/auth/requestOtp",
    method: "POST",
    body: payload,
  };
}

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export function prepareVerifyOtp(payload: VerifyOtpPayload): {
  url: string;
  method: "POST";
  body: VerifyOtpPayload;
} {
  return {
    url: "/auth/verifyOtp",
    method: "POST",
    body: payload,
  };
}

export type VerifyOtpResponse = {
  token: string;
};

export function prepareMe(): {
  url: string;
  method: "GET";
  body: undefined;
} {
  return {
    url: "/auth/me",
    method: "GET",
    body: undefined,
  };
}
