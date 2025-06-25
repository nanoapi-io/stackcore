import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "@stackcore/db";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { tokenNotFoundError } from "./service.ts";
import { TokenApiTypes } from "../responseType.ts";

// POST /tokens (create token)
Deno.test("create token", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    const { url, method, body } = TokenApiTypes.prepareCreateToken({
      name: "My API Token",
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 201);
    const responseBody = await response?.json();
    assertEquals(typeof responseBody.uuid, "string");
    assertEquals(responseBody.uuid.length, 36); // UUID length

    // Verify token was created in database
    const createdToken = await db
      .selectFrom("token")
      .selectAll()
      .where("user_id", "=", userId)
      .where("name", "=", "My API Token")
      .executeTakeFirst();

    assertNotEquals(createdToken, undefined);
    assertEquals(createdToken?.name, "My API Token");
    assertEquals(createdToken?.uuid, responseBody.uuid);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create token - empty name", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method, body } = TokenApiTypes.prepareCreateToken({
      name: "",
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create token - unauthorized", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { url, method, body } = TokenApiTypes.prepareCreateToken({
      name: "My API Token",
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 401);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// GET /tokens (list tokens)
Deno.test("get tokens", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create test tokens
    const tokenNames = ["Token 1", "Token 2", "Token 3"];
    const createdTokens = [];

    for (const name of tokenNames) {
      const createdToken = await db
        .insertInto("token")
        .values({
          user_id: userId,
          name,
          created_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTokens.push(createdToken);
    }

    const { url, method } = TokenApiTypes.prepareGetTokens({
      page: 1,
      limit: 10,
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 3);
    assertEquals(responseBody.results.length, 3);

    // Check that UUIDs are masked
    for (const token of responseBody.results) {
      assertEquals(typeof token.maskedUuid, "string");
      assertEquals(token.maskedUuid.startsWith("****"), true);
      assertEquals(token.maskedUuid.length, 8); // **** + 4 chars
    }

    // Check that results are ordered by created_at desc (newest first)
    const firstToken = responseBody.results[0];
    const lastToken = responseBody.results[responseBody.results.length - 1];
    assertEquals(
      new Date(firstToken.created_at) >= new Date(lastToken.created_at),
      true,
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get tokens - pagination", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create 15 test tokens
    for (let i = 0; i < 15; i++) {
      await db
        .insertInto("token")
        .values({
          user_id: userId,
          name: `Token ${i + 1}`,
          created_at: new Date(),
        })
        .execute();
    }

    const { url: url1, method: method1 } = TokenApiTypes.prepareGetTokens({
      page: 1,
      limit: 10,
    });

    // Test first page
    const response1 = await api.handle(
      new Request(
        `http://localhost:3000${url1}`,
        {
          method: method1,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response1, undefined);
    assertEquals(response1?.status, 200);
    const responseBody1 = await response1?.json();
    assertEquals(responseBody1.total, 15);
    assertEquals(responseBody1.results.length, 10);

    const { url: url2, method: method2 } = TokenApiTypes.prepareGetTokens({
      page: 2,
      limit: 10,
    });

    // Test second page
    const response2 = await api.handle(
      new Request(
        `http://localhost:3000${url2}`,
        {
          method: method2,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response2, undefined);
    assertEquals(response2?.status, 200);
    const responseBody2 = await response2?.json();
    assertEquals(responseBody2.total, 15);
    assertEquals(responseBody2.results.length, 5); // Remaining 5 tokens
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get tokens - empty list", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = TokenApiTypes.prepareGetTokens({
      page: 1,
      limit: 10,
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 0);
    assertEquals(responseBody.results.length, 0);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get tokens - invalid parameters", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = TokenApiTypes.prepareGetTokens({
      page: -1,
      limit: -10,
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get tokens - unauthorized", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { url, method } = TokenApiTypes.prepareGetTokens({
      page: 1,
      limit: 10,
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 401);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// DELETE /tokens/:tokenId (delete token)
Deno.test("delete token", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create a test token
    const createdToken = await db
      .insertInto("token")
      .values({
        user_id: userId,
        name: "Test Token",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method } = TokenApiTypes.prepareDeleteToken(createdToken.id);

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.message, "Token deleted successfully");

    // Verify token was deleted from database
    const deletedToken = await db
      .selectFrom("token")
      .selectAll()
      .where("id", "=", createdToken.id)
      .executeTakeFirst();

    assertEquals(deletedToken, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete token - non-existent token", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = TokenApiTypes.prepareDeleteToken(999999);

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, tokenNotFoundError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete token - invalid token ID format", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = TokenApiTypes.prepareDeleteToken(-1);

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete token - token belongs to different user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user and their token
    const { userId: userId1 } = await createTestUserAndToken();
    const createdToken = await db
      .insertInto("token")
      .values({
        user_id: userId1,
        name: "User 1 Token",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create second user
    const { token: user2Token } = await createTestUserAndToken();

    const { url, method } = TokenApiTypes.prepareDeleteToken(createdToken.id);

    // User 2 tries to delete User 1's token
    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${user2Token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, tokenNotFoundError);

    // Verify token still exists in database
    const stillExistsToken = await db
      .selectFrom("token")
      .selectAll()
      .where("id", "=", createdToken.id)
      .executeTakeFirst();

    assertNotEquals(stillExistsToken, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete token - unauthorized", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { url, method } = TokenApiTypes.prepareDeleteToken(1);

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 401);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// Test API token authentication
Deno.test("create token using API token authentication", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId } = await createTestUserAndToken();

    // Create an API token first
    const apiToken = await db
      .insertInto("token")
      .values({
        user_id: userId,
        name: "Test API Token",
        created_at: new Date(),
      })
      .returning(["uuid"])
      .executeTakeFirstOrThrow();

    const { url, method, body } = TokenApiTypes.prepareCreateToken({
      name: "Another Token",
    });

    // Use API token for authentication instead of JWT
    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": apiToken.uuid,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 201);
    const responseBody = await response?.json();
    assertEquals(typeof responseBody.uuid, "string");

    // Verify the API token's last_used_at was updated
    const updatedToken = await db
      .selectFrom("token")
      .select(["last_used_at"])
      .where("uuid", "=", apiToken.uuid)
      .executeTakeFirstOrThrow();

    assertNotEquals(updatedToken.last_used_at, null);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("API token authentication with invalid token", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { url, method, body } = TokenApiTypes.prepareCreateToken({
      name: "Test Token",
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "X-API-Token": "invalid-uuid-here",
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 401);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "Invalid or expired token");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("JWT takes precedence over API token", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token: jwtToken } = await createTestUserAndToken();

    // Create an API token
    const apiToken = await db
      .insertInto("token")
      .values({
        user_id: userId,
        name: "Test API Token",
        created_at: new Date(),
      })
      .returning(["uuid"])
      .executeTakeFirstOrThrow();

    const { url, method, body } = TokenApiTypes.prepareCreateToken({
      name: "Test Token",
    });

    // Provide both JWT and API token - JWT should take precedence
    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}`,
            "X-API-Token": apiToken.uuid,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 201);
    const responseBody = await response?.json();
    assertEquals(typeof responseBody.uuid, "string");

    // The API token's last_used_at should NOT be updated since JWT was used
    const unchangedToken = await db
      .selectFrom("token")
      .select(["last_used_at"])
      .where("uuid", "=", apiToken.uuid)
      .executeTakeFirstOrThrow();

    assertEquals(unchangedToken.last_used_at, null);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
