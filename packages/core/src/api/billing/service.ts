import { db } from "../../db/database.ts";
import { StripeService } from "../../stripe/index.ts";
import type { Body } from "@oak/oak/body";

const notAMemberOfOrganizationError = "not_a_member_of_organization";

export class BillingService {
  public async updateSubscription(
    userId: number,
    organizationId: number,
    returnUrl: string,
  ): Promise<{ url?: string; error?: string }> {
    const isMember = await db
      .selectFrom("organization_member")
      .select("user_id")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfOrganizationError };
    }

    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .executeTakeFirstOrThrow();

    const stripeService = new StripeService();
    const session = await stripeService.updateSubscription(
      organization,
      returnUrl,
    );

    return {
      url: session.url,
    };
  }

  public async updatePaymentMethod(
    userId: number,
    organizationId: number,
    returnUrl: string,
  ): Promise<{ url?: string; error?: string }> {
    const isMember = await db
      .selectFrom("organization_member")
      .select("user_id")
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfOrganizationError };
    }

    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .executeTakeFirstOrThrow();

    const stripeService = new StripeService();
    const session = await stripeService.updatePaymentMethod(
      organization,
      returnUrl,
    );

    return {
      url: session.url,
    };
  }

  public async handleWebhook(reqBody: Body) {
    const stripeService = new StripeService();
    const { status, body } = await stripeService.handleWebhook(reqBody);

    return {
      status,
      body,
    };
  }
}
