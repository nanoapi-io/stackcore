import { z } from "zod";

export const createTokenSchema = z.object({
  name: z.string().nonempty(),
});

export type CreateTokenPayload = z.infer<typeof createTokenSchema>;

export type CreateTokenResponse = {
  uuid: string;
};

export type GetTokensResponse = {
  results: {
    id: number;
    name: string;
    maskedUuid: string;
    last_used_at: Date | null;
    created_at: Date;
  }[];
  total: number;
};

export function prepareCreateToken(payload: CreateTokenPayload) {
  return {
    url: `/tokens`,
    method: "POST",
    body: payload,
  };
}

export function prepareGetTokens(payload: {
  page: number;
  limit: number;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }

  return {
    url: `/tokens?${searchParams.toString()}`,
    method: "GET",
    body: undefined,
  };
}

export function prepareDeleteToken(tokenId: number) {
  return {
    url: `/tokens/${tokenId}`,
    method: "DELETE",
    body: undefined,
  };
}
