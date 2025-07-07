import { create, getNumericDate, verify } from "djwt";
import { db } from "../../db/database.ts";
import settings from "../../settings.ts";
import { sendOtpEmail, sendWelcomeEmail } from "../../email/index.ts";
import { StripeService } from "../../stripe/index.ts";
import { shouldHaveAccess } from "../../db/models/workspace.ts";
import type { User } from "../../db/models/user.ts";
import { memberTypes, stripeTypes } from "@stackcore/shared";
import { type Session, sessionSchema } from "./middleware.ts";

export const secretCryptoKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(settings.SECRET_KEY),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

export const invalidOtpErrorCode = "invalid_otp";
export const otpExpiredErrorCode = "otp_expired";
export const otpMaxAttemptsErrorCode = "otp_max_attempts";
export const otpAlreadyRequestedErrorCode = "otp_already_requested";

export class AuthService {
  private generateOtp() {
    const otp = crypto.getRandomValues(new Uint32Array(1))[0] % 999_999;
    const paddedOtp = otp.toString().padStart(6, "0");
    return paddedOtp;
  }

  /**
   * Generate and save an OTP for a user
   */
  public async requestOtp(
    email: string,
  ): Promise<{ error?: string }> {
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
      // check if the user has already requested an OTP in the last 10 minutes
      if (
        existingUser.otp_requested_at &&
        existingUser.otp_requested_at > new Date(
            Date.now() - settings.OTP.REQUEST_INTERVAL_SECONDS * 1000,
          )
      ) {
        return { error: otpAlreadyRequestedErrorCode };
      }
    }

    if (existingUser) {
      // Update existing user with new OTP
      await db
        .updateTable("user")
        .set({
          otp,
          otp_attempts: 0,
          otp_requested_at: new Date(),
          otp_expires_at: expiresAt,
        })
        .where("email", "=", email)
        .execute();
    } else {
      // create a new user with the OTP
      await db
        .insertInto("user")
        .values({
          email,
          otp,
          otp_attempts: 0,
          otp_requested_at: new Date(),
          otp_expires_at: expiresAt,
          created_at: new Date(),
        })
        .execute();
    }

    // Send OTP to user via email
    await sendOtpEmail(email, otp);

    return {};
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
      error?: string;
    }
  > {
    const now = new Date();

    const user = await db
      .selectFrom("user")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();

    if (!user) {
      return { error: invalidOtpErrorCode };
    }

    if (user.otp_attempts >= settings.OTP.MAX_ATTEMPTS) {
      return { error: otpMaxAttemptsErrorCode };
    }

    if (settings.OTP.SKIP_OTP) {
      console.error(
        "OTP verification skipped. This should not happen in production!",
      );
    } else {
      if (user.otp !== otp) {
        await db
          .updateTable("user")
          .set({
            otp_attempts: user.otp_attempts + 1,
          })
          .where("id", "=", user.id)
          .execute();
        return { error: invalidOtpErrorCode };
      }
    }

    if (!user.otp_expires_at || user.otp_expires_at < now) {
      return { error: otpExpiredErrorCode };
    }

    const personalWorkspace = await db
      .selectFrom("workspace")
      .innerJoin(
        "member",
        "member.workspace_id",
        "workspace.id",
      )
      .selectAll("workspace")
      .where("isTeam", "=", false)
      .where("member.user_id", "=", user.id)
      .executeTakeFirst();

    if (!personalWorkspace) {
      // create a personal workspace, membership and subscription
      // everything in a transaction, so if something fails we do not end up in a broken state
      await db.transaction().execute(async (trx) => {
        const newPersonalWorkspace = await trx
          .insertInto("workspace")
          .values({
            name: "Personal",
            isTeam: false,
            stripe_customer_id: null,
            access_enabled: false,
            deactivated: false,
            created_at: new Date(),
          })
          .returningAll()
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("member")
          .values({
            role: memberTypes.ADMIN_ROLE,
            workspace_id: newPersonalWorkspace.id,
            user_id: user.id,
            created_at: new Date(),
          })
          .executeTakeFirstOrThrow();

        const stripeService = new StripeService();
        const customer = await stripeService.createCustomer(
          newPersonalWorkspace.id,
          newPersonalWorkspace.name,
        );
        const subscription = await stripeService.createSubscription(
          customer.id,
          stripeTypes.BASIC_PRODUCT,
          stripeTypes.MONTHLY_BILLING_CYCLE,
          settings.STRIPE.BILLING_THRESHOLD_BASIC,
        );

        const accessEnabled = shouldHaveAccess(subscription.status);

        await trx
          .updateTable("workspace")
          .set({
            stripe_customer_id: customer.id,
            access_enabled: accessEnabled,
          })
          .where("id", "=", newPersonalWorkspace.id)
          .execute();
      });

      await sendWelcomeEmail(email);
    }

    await db
      .updateTable("user")
      .set({
        // reset OTP
        otp: null,
        otp_expires_at: null,
        // update last login date
        last_login_at: new Date(),
      })
      .where("id", "=", user.id)
      .execute();

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
      } as Session & { exp: number },
      secretCryptoKey,
    );
  }

  /**
   * Verify and decode JWT token
   */
  public async verifyToken(
    token: string,
  ): Promise<{ userId: number; email: string } | false> {
    try {
      const payload = await verify(token, secretCryptoKey);

      const parsedPayload = sessionSchema.safeParse({
        userId: payload.userId,
        email: payload.email,
      });

      if (!parsedPayload.success) {
        return false;
      }

      const user = await db
        .selectFrom("user")
        .selectAll()
        .where("id", "=", parsedPayload.data.userId)
        .executeTakeFirst();

      if (!user) {
        return false;
      }

      return parsedPayload.data;
    } catch {
      return false;
    }
  }
}
