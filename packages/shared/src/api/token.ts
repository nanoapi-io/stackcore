export type CreateTokenPayload = {
  name: string;
};

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

export function prepareCreateToken(
  payload: CreateTokenPayload,
): {
  url: string;
  method: string;
  body: CreateTokenPayload;
} {
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
}): {
  url: string;
  method: string;
} {
  const searchParams = new URLSearchParams();
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }

  return {
    url: `/tokens?${searchParams.toString()}`,
    method: "GET",
  };
}

export function prepareDeleteToken(tokenId: number): {
  url: string;
  method: string;
} {
  return {
    url: `/tokens/${tokenId}`,
    method: "DELETE",
  };
}
