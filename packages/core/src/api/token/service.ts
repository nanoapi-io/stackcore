import { db, type NewToken } from "@stackcore/db";
import type { CreateTokenResponse, GetTokensResponse } from "./types.ts";

export const tokenNotFoundError = "token_not_found";
export const invalidTokenNameError = "invalid_token_name";

export class TokenService {
  /**
   * Create a new token for a user
   */
  public async createToken(
    userId: number,
    name: string,
  ): Promise<CreateTokenResponse> {
    const newToken: NewToken = {
      user_id: userId,
      name: name.trim(),
      created_at: new Date(),
    };

    const createdToken = await db
      .insertInto("token")
      .values(newToken)
      .returning(["uuid"])
      .executeTakeFirstOrThrow();

    return { uuid: createdToken.uuid };
  }

  /**
   * Get all tokens for a user
   */
  public async getTokens(
    userId: number,
    page: number,
    limit: number,
    search?: string,
  ): Promise<GetTokensResponse> {
    // Get total count
    const totalResult = await db
      .selectFrom("token")
      .select(({ fn }) => [fn.countAll().as("total")])
      .where("user_id", "=", userId)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .executeTakeFirst();

    const total = Number(totalResult?.total) || 0;

    // Get paginated tokens
    const tokens = await db
      .selectFrom("token")
      .select([
        "id",
        "name",
        "uuid",
        "last_used_at",
        "created_at",
      ])
      .where("user_id", "=", userId)
      .where((eb) => {
        if (search) {
          return eb.and([
            eb("name", "like", `%${search}%`),
          ]);
        }
        return eb.and([]);
      })
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();

    const results = tokens.map((token) => ({
      id: token.id,
      name: token.name,
      maskedUuid: `****${token.uuid.slice(-4)}`,
      last_used_at: token.last_used_at,
      created_at: token.created_at,
    }));

    return {
      results,
      total,
    };
  }

  /**
   * Delete a token
   */
  public async deleteToken(
    userId: number,
    tokenId: number,
  ): Promise<{ error?: string }> {
    // Check if token exists and belongs to the user
    const token = await db
      .selectFrom("token")
      .select(["id", "user_id"])
      .where("id", "=", tokenId)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!token) {
      return { error: tokenNotFoundError };
    }

    // Delete the token
    await db
      .deleteFrom("token")
      .where("id", "=", tokenId)
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    return {};
  }

  /**
   * Verify an API token and return user information
   */
  public async verifyApiToken(
    uuid: string,
  ): Promise<{ userId: number; email: string } | false> {
    try {
      // Look up token with user info
      const tokenWithUser = await db
        .selectFrom("token")
        .innerJoin("user", "user.id", "token.user_id")
        .select([
          "token.id",
          "token.user_id",
          "user.email",
        ])
        .where("token.uuid", "=", uuid)
        .executeTakeFirst();

      if (!tokenWithUser) {
        return false;
      }

      // Update last_used_at timestamp
      await db
        .updateTable("token")
        .set({ last_used_at: new Date() })
        .where("id", "=", tokenWithUser.id)
        .execute();

      return {
        userId: tokenWithUser.user_id,
        email: tokenWithUser.email,
      };
    } catch {
      return false;
    }
  }
}
