import { AuthService } from "../api/auth/service.ts";
import { db } from "../db/database.ts";

export async function createTestUserAndToken() {
  const email = `test-${crypto.randomUUID()}@example.com`;
  const authService = new AuthService();
  const otp = await authService.requestOtp(email);

  const { token } = await authService.verifyOtp(email, otp);
  if (!token) throw new Error("Failed to verify OTP");

  const user = await db
    .selectFrom("user")
    .where("email", "=", email)
    .select("id")
    .executeTakeFirstOrThrow();

  const personalOrg = await db
    .selectFrom("organization")
    .innerJoin(
      "organization_member",
      "organization_member.organization_id",
      "organization.id",
    )
    .where("organization_member.user_id", "=", user.id)
    .where("organization.isTeam", "=", false)
    .select("organization.id")
    .executeTakeFirstOrThrow();

  return {
    token,
    userId: user.id,
    email,
    personalOrgId: personalOrg.id,
  };
}
