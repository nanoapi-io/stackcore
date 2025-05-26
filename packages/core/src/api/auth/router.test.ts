import { assertEquals, assertGreater, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { AuthService, secretCryptoKey } from "./service.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { getNumericDate, verify } from "djwt";
import settings from "../../settings.ts";
import type { User } from "../../db/models/user.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { ADMIN_ROLE } from "../../db/models/organizationMember.ts";
import { prepareMe, prepareRequestOtp, prepareVerifyOtp } from "./types.ts";

Deno.test("request otp, invalid email", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `invalidemail`;

    const requestInfo = prepareRequestOtp({ email });

    const response = await api.handle(
      new Request(`http://localhost:3000${requestInfo.url}`, {
        method: requestInfo.method,
        body: JSON.stringify(requestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response!.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("request otp for new user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;

    let user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    // User should not exist
    assertEquals(user, undefined);

    const requestInfo = prepareRequestOtp({ email });

    const response = await api.handle(
      new Request(`http://localhost:3000${requestInfo.url}`, {
        method: requestInfo.method,
        body: JSON.stringify(requestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response!.status, 200);

    const responseBody = await response?.json();
    assertEquals(responseBody.message, "OTP sent successfully");

    user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    // User should exist
    assertNotEquals(user, undefined);
    assertNotEquals(user, null);
    assertEquals(user?.email, email);
    assertNotEquals(user?.otp, null);
    assertEquals(user?.otp?.length, 6);

    const personalOrg = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .selectAll("organization")
      .where("organization.isTeam", "=", false)
      .where("organization_member.user_id", "=", (user as User).id)
      .executeTakeFirst();

    // Personal organization should not exist
    assertEquals(personalOrg, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("request otp for existing user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, email } = await createTestUserAndToken();

    const user = await db
      .selectFrom("user")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirstOrThrow();

    assertEquals(user.email, email);
    assertEquals(user.otp, null);
    assertEquals(user.otp_expires_at, null);

    const requestInfo = prepareRequestOtp({ email });

    const response = await api.handle(
      new Request(`http://localhost:3000${requestInfo.url}`, {
        method: requestInfo.method,
        body: JSON.stringify(requestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response?.status, 200);

    const responseBody = await response?.json();
    assertEquals(responseBody.message, "OTP sent successfully");

    const newUser = await db
      .selectFrom("user")
      .selectAll()
      .where("id", "=", user.id)
      .executeTakeFirstOrThrow();

    assertNotEquals(newUser.otp, null); // OTP should have been updated
    assertEquals(newUser.otp?.length, 6);
    assertNotEquals(newUser.otp_expires_at, null);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("verify otp for new user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;

    const authService = new AuthService();
    const otp = await authService.requestOtp(email);

    const requestInfo = prepareVerifyOtp({ email, otp });

    const response = await api.handle(
      new Request(`http://localhost:3000${requestInfo.url}`, {
        method: requestInfo.method,
        body: JSON.stringify(requestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response!.status, 200);

    const user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirstOrThrow();

    const responseBody = await response!.json();

    // Verify token is valid
    assertGreater(responseBody.token.length, 0);
    const payload = await verify(responseBody.token, secretCryptoKey);
    assertEquals(payload.userId, user?.id);
    assertEquals(payload.email, user?.email);
    assertEquals(
      payload.exp as number,
      getNumericDate(settings.JWT.EXPIRY_DAYS * 24 * 60 * 60),
    );

    // check personal organization was created
    const personalOrg = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .selectAll("organization")
      .where("isTeam", "=", false)
      .where("organization_member.user_id", "=", user.id)
      .executeTakeFirstOrThrow();

    assertEquals(personalOrg.name, "Personal");
    assertEquals(personalOrg.isTeam, false);
    assertEquals(personalOrg.stripe_customer_id?.startsWith("cus_"), true);
    assertEquals(personalOrg.access_enabled, true);
    assertEquals(personalOrg.deactivated, false);

    const personalOrgMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", personalOrg.id)
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow();

    assertEquals(personalOrgMember.role, ADMIN_ROLE);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("verify otp for existing user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, email } = await createTestUserAndToken();

    const user = await db
      .selectFrom("user")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirstOrThrow();

    assertEquals(user.email, email);
    assertEquals(user.otp, null);
    assertEquals(user.otp_expires_at, null);

    const personalOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("isTeam", "=", false)
      .executeTakeFirstOrThrow();

    assertEquals(personalOrg.name, "Personal");
    assertEquals(personalOrg.isTeam, false);
    assertEquals(personalOrg.stripe_customer_id?.startsWith("cus_"), true);
    assertEquals(personalOrg.access_enabled, true);
    assertEquals(personalOrg.deactivated, false);

    const personalOrgMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", personalOrg.id)
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow();

    assertEquals(personalOrgMember.role, ADMIN_ROLE);

    const authService = new AuthService();
    const otp = await authService.requestOtp(email);

    const requestInfo = prepareVerifyOtp({ email, otp });

    const response = await api.handle(
      new Request(`http://localhost:3000${requestInfo.url}`, {
        method: requestInfo.method,
        body: JSON.stringify(requestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response!.status, 200);

    const responseBody = await response!.json();

    // Verify token is valid
    assertGreater(responseBody.token.length, 0);
    const payload = await verify(responseBody.token, secretCryptoKey);
    assertEquals(payload.userId, user?.id);
    assertEquals(payload.email, user?.email);
    assertEquals(
      payload.exp as number,
      getNumericDate(settings.JWT.EXPIRY_DAYS * 24 * 60 * 60),
    );

    // check personal organization was not created again
    const newPersonalOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("isTeam", "=", false)
      .executeTakeFirst();

    assertEquals(newPersonalOrg, personalOrg);

    // check personal organization member was not created again
    const newPersonalOrgMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", personalOrg.id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();

    assertEquals(newPersonalOrgMember, personalOrgMember);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("verify otp - should block after max failed attempts", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;
    const authService = new AuthService();

    // Request OTP
    const validOtp = await authService.requestOtp(email);
    const wrongOtp = "000000"; // Wrong OTP

    // Make 3 failed attempts (assuming MAX_ATTEMPTS is 3)
    for (let i = 0; i < settings.OTP.MAX_ATTEMPTS; i++) {
      const requestInfo = prepareVerifyOtp({ email, otp: wrongOtp });

      const response = await api.handle(
        new Request(`http://localhost:3000${requestInfo.url}`, {
          method: requestInfo.method,
          body: JSON.stringify(requestInfo.body),
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );

      assertEquals(response!.status, 400);
      const responseBody = await response!.json();
      assertEquals(responseBody.error, "invalid_otp");
    }

    // Next attempt should be blocked
    const blockedRequestInfo = prepareVerifyOtp({ email, otp: wrongOtp });
    const blockedResponse = await api.handle(
      new Request(`http://localhost:3000${blockedRequestInfo.url}`, {
        method: blockedRequestInfo.method,
        body: JSON.stringify(blockedRequestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(blockedResponse!.status, 400);
    const blockedResponseBody = await blockedResponse!.json();
    assertEquals(blockedResponseBody.error, "otp_max_attempts");

    // Even correct OTP should be blocked now
    const correctRequestInfo = prepareVerifyOtp({ email, otp: validOtp });
    const correctResponse = await api.handle(
      new Request(`http://localhost:3000${correctRequestInfo.url}`, {
        method: correctRequestInfo.method,
        body: JSON.stringify(correctRequestInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(correctResponse!.status, 400);
    const correctResponseBody = await correctResponse!.json();
    assertEquals(correctResponseBody.error, "otp_max_attempts");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("verify otp - should reset attempts on new OTP request", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;

    // Request initial OTP
    const requestOtpInfo = prepareRequestOtp({ email });
    await api.handle(
      new Request(`http://localhost:3000${requestOtpInfo.url}`, {
        method: requestOtpInfo.method,
        body: JSON.stringify(requestOtpInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    // Make some failed attempts
    const wrongOtp = "000000";
    for (let i = 0; i < 2; i++) {
      const verifyInfo = prepareVerifyOtp({ email, otp: wrongOtp });
      await api.handle(
        new Request(`http://localhost:3000${verifyInfo.url}`, {
          method: verifyInfo.method,
          body: JSON.stringify(verifyInfo.body),
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    }

    // Verify attempts were recorded
    let user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirstOrThrow();
    assertEquals(user.otp_attempts, 2);

    // Request new OTP - should reset attempts
    const authService = new AuthService();
    const newOtp = await authService.requestOtp(email);

    user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirstOrThrow();
    assertEquals(user.otp_attempts, 0); // Should be reset

    // Should be able to verify with new OTP
    const newVerifyInfo = prepareVerifyOtp({ email, otp: newOtp });
    const response = await api.handle(
      new Request(`http://localhost:3000${newVerifyInfo.url}`, {
        method: newVerifyInfo.method,
        body: JSON.stringify(newVerifyInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response!.status, 200);
    const responseBody = await response!.json();
    assertGreater(responseBody.token.length, 0);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("verify otp - should track failed attempts correctly", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;
    const authService = new AuthService();

    // Request OTP
    await authService.requestOtp(email);
    const wrongOtp = "000000";

    // Make first failed attempt
    const firstAttemptInfo = prepareVerifyOtp({ email, otp: wrongOtp });
    const firstResponse = await api.handle(
      new Request(`http://localhost:3000${firstAttemptInfo.url}`, {
        method: firstAttemptInfo.method,
        body: JSON.stringify(firstAttemptInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(firstResponse!.status, 400);

    let user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirstOrThrow();
    assertEquals(user.otp_attempts, 1);

    // Make second failed attempt
    const secondAttemptInfo = prepareVerifyOtp({ email, otp: wrongOtp });
    const secondResponse = await api.handle(
      new Request(`http://localhost:3000${secondAttemptInfo.url}`, {
        method: secondAttemptInfo.method,
        body: JSON.stringify(secondAttemptInfo.body),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(secondResponse!.status, 400);

    user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirstOrThrow();
    assertEquals(user.otp_attempts, 2);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user info", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token, userId, email } = await createTestUserAndToken();

    const requestInfo = prepareMe();

    const response = await api.handle(
      new Request(`http://localhost:3000${requestInfo.url}`, {
        method: requestInfo.method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response!.status, 200);

    const responseBody = await response!.json();
    assertEquals(responseBody.userId, userId);
    assertEquals(responseBody.email, email);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
