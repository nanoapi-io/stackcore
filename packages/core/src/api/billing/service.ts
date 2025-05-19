import { db } from "../../db/database.ts";
import { StripeService } from "../../stripe/index.ts";
import type { Body } from "@oak/oak/body";

const organizationNotFoundErrorCode = "organization_not_found";
const notAMemberOfOrganizationError = "not_a_member_of_organization";

export class BillingService {
  public async createBillingPortalSession(
    userId: number,
    organizationId: number,
    returnUrl: string,
  ): Promise<{ url?: string; error?: string }> {
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .where("type", "=", "team")
      .executeTakeFirst();

    if (!organization) {
      return {
        error: organizationNotFoundErrorCode,
      };
    }

    // Check if user is an admin of the organization
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .executeTakeFirst();

    if (!member) {
      return {
        error: notAMemberOfOrganizationError,
      };
    }

    const stripeService = new StripeService();
    const session = await stripeService.createBillingPortalSession(
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
