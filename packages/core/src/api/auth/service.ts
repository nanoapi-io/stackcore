import { create, getNumericDate, verify } from "djwt";
import { db } from "../../db/database.ts";
import type { User } from "../../db/types.ts";
import settings from "../../settings.ts";
import { sendOtpEmail } from "../../email/index.ts";
import { OrganizationService } from "../organization/service.ts";

export const secretCryptoKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(settings.SECRET_KEY),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

export const invalidOtpErrorCode = "invalid_otp";
export const otpExpiredErrorCode = "otp_expired";

export class AuthService {
  private generateOtp() {
    const otp = crypto.getRandomValues(new Uint32Array(1))[0] % 999_999;
    const paddedOtp = otp.toString().padStart(6, "0");
    return paddedOtp;
  }

  /**
   * Generate and save an OTP for a user
   */
  public async requestOtp(email: string): Promise<string> {
    // Generate a 6-digit OTP
    const otp = this.generateOtp();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + settings.OTP.EXPIRY_MINUTES);

    // Check if user exists
    const existingUser = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    if (existingUser) {
      // Update existing user with new OTP
      await db
        .updateTable("user")
        .set({
          otp,
          otp_expires_at: expiresAt,
        })
        .where("email", "=", email)
        .execute();
    } else {
      // Create new user with OTP
      const newUser = await db
        .insertInto("user")
        .values({
          email,
          otp,
          otp_expires_at: expiresAt,
          created_at: new Date(),
          last_login_at: new Date(),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Create personal organization for new user
      const orgService = new OrganizationService();
      await orgService.createPersonalOrganization(newUser.id);
    }

    // Send OTP to user via email
    sendOtpEmail(email, otp);

    return otp;
  }

  /**
   * Verify OTP and authenticate user
   */
  public async verifyOtp(
    email: string,
    otp: string,
  ): Promise<
    {
      token?: string;
      error?: typeof invalidOtpErrorCode | typeof otpExpiredErrorCode;
    }
  > {
    const now = new Date();

    const user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .where("otp", "=", otp)
      .executeTakeFirst();

    if (!user) {
      return { error: invalidOtpErrorCode };
    }

    if (user.otp_expires_at && user.otp_expires_at < now) {
      return { error: otpExpiredErrorCode };
    }

    // Update user record - clear OTP and update last login
    await db
      .updateTable("user")
      .set({
        otp: null,
        otp_expires_at: null,
      })
      .where("id", "=", user.id)
      .execute();

    // Create JWT token
    const token = await this.generateToken(user);

    return { token };
  }

  /**
   * Generate JWT token for authenticated user
   */
  private async generateToken(user: User): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.JWT.EXPIRY_DAYS);

    const exp = getNumericDate(settings.JWT.EXPIRY_DAYS * 24 * 60 * 60);

    return await create(
      { alg: "HS256", typ: "JWT" },
      {
        userId: user.id,
        email: user.email,
        exp: exp,
      },
      secretCryptoKey,
    );
  }

  /**
   * Verify and decode JWT token
   */
  public async verifyToken(
    token: string,
  ): Promise<{ userId: number; email: string } | null> {
    try {
      const payload = await verify(token, secretCryptoKey);
      return {
        userId: payload.userId as number,
        email: payload.email as string,
      };
    } catch {
      return null;
    }
  }
}
