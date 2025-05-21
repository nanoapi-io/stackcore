import { assertEquals, assertGreater, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { AuthService, secretCryptoKey } from "./service.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { getNumericDate, verify } from "djwt";
import settings from "../../settings.ts";
import {
  BASIC_PLAN,
  MONTHLY_BILLING_CYCLE,
  type User,
} from "../../db/types.ts";

Deno.test("request otp, invalid email", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `invalidemail`;

    const response = await api.handle(
      new Request("http://localhost:3000/auth/requestOtp", {
        method: "POST",
        body: JSON.stringify({ email }),
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

    const response = await api.handle(
      new Request("http://localhost:3000/auth/requestOtp", {
        method: "POST",
        body: JSON.stringify({ email }),
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
      .where("organization_member.user_id", "=", (user as User).id)
      .executeTakeFirst();

    // Personal organization should exist
    assertNotEquals(personalOrg, undefined);
    assertEquals(personalOrg?.name, "Personal");
    assertEquals(personalOrg?.isTeam, false);
    assertEquals(personalOrg?.plan, BASIC_PLAN);
    assertEquals(personalOrg?.billing_cycle, MONTHLY_BILLING_CYCLE);
    assertEquals(
      (personalOrg?.stripe_customer_id as string).startsWith("cus_"),
      true,
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("request otp for existing user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;

    const authService = new AuthService();
    const otp = await authService.requestOtp(email);

    let user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    // User should exist
    assertNotEquals(user, undefined);
    assertNotEquals(user, null);

    const response = await api.handle(
      new Request("http://localhost:3000/auth/requestOtp", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    );

    assertEquals(response?.status, 200);

    const responseBody = await response?.json();
    assertEquals(responseBody.message, "OTP sent successfully");

    user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    assertNotEquals(user?.otp, otp); // OTP should have been updated
    assertEquals(user?.otp, user?.otp);
    assertEquals(user?.otp_expires_at, user?.otp_expires_at);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("verify otp", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const email = `test-${crypto.randomUUID()}@example.com`;

    const authService = new AuthService();
    const otp = await authService.requestOtp(email);

    const response = await api.handle(
      new Request("http://localhost:3000/auth/verifyOtp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
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
      .executeTakeFirst();

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
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
