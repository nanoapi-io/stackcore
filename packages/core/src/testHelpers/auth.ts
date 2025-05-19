import { AuthService } from "../api/auth/service.ts";
import { OrganizationService } from "../api/organization/service.ts";
import { db } from "../db/database.ts";

export async function createTestUserAndToken(): Promise<
  { userId: number; token: string; email: string }
> {
  const email = `test-${Date.now()}@example.com`;
  const authService = new AuthService();
  const otp = await authService.requestOtp(email);

  const { token } = await authService.verifyOtp(email, otp);
  if (!token) throw new Error("Failed to verify OTP");

  const user = await db
    .selectFrom("user")
    .selectAll()
    .where("email", "=", email)
    .executeTakeFirstOrThrow();

  const orgService = new OrganizationService();
  await orgService.createPersonalOrganization(user.id);

  return { userId: user.id, token, email };
}
