import { AuthService } from "../api/auth/service.ts";
import { db } from "../db/database.ts";

export async function createTestUserAndToken() {
  const email = `test-${crypto.randomUUID()}@example.com`;

  const authService = new AuthService();
  await authService.requestOtp(email);
  const { otp } = await db.selectFrom("user")
    .where("email", "=", email)
    .select("otp")
    .executeTakeFirstOrThrow();

  if (!otp) throw new Error("Failed to get OTP");

  const { token } = await authService.verifyOtp(email, otp);
  if (!token) throw new Error("Failed to verify OTP");

  const user = await db
    .selectFrom("user")
    .where("email", "=", email)
    .select("id")
    .executeTakeFirstOrThrow();

  const personalWorkspace = await db
    .selectFrom("workspace")
    .innerJoin(
      "member",
      "member.workspace_id",
      "workspace.id",
    )
    .where("member.user_id", "=", user.id)
    .where("workspace.isTeam", "=", false)
    .select("workspace.id")
    .executeTakeFirstOrThrow();

  return {
    token,
    userId: user.id,
    email,
    personalWorkspaceId: personalWorkspace.id,
  };
}
