import { type Context, Status } from "@oak/oak";
import { db } from "../../db/database.ts";
import { StripeService } from "../../stripe/index.ts";
import type { Stripe } from "stripe";
import {
  BASIC_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  type StripeBillingCycle,
  type StripeProduct,
  YEARLY_BILLING_CYCLE,
} from "../../db/models/organization.ts";
import { shouldHaveAccess } from "../../db/models/organization.ts";

const notAMemberOfOrganizationError = "not_a_member_of_organization";

export class BillingService {
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

    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();
    const session = await stripeService.updatePaymentMethod(
      organization.stripe_customer_id,
      returnUrl,
    );

    return {
      url: session.url,
    };
  }

  public async handleWebhook(ctx: Context) {
    const stripeService = new StripeService();

    const signature = ctx.request.headers.get("stripe-signature");

    if (!signature) {
      return {
        status: Status.BadRequest,
        body: "No signature",
      };
    }

    const bodyText = await ctx.request.body.text();

    const event = stripeService.getWebhookEvent(bodyText, signature);

    switch (event.type) {
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionCreatedOrUpdated(event);
        break;
      default:
        console.warn(`Unhandled event received: type ${event.type}`);
        break;
    }

    return {
      status: Status.OK,
      body: "Event received",
    };
  }

  private async handleSubscriptionDeleted(
    event: Stripe.CustomerSubscriptionDeletedEvent,
  ) {
    const subscription = event.data.object;
    const customer = subscription.customer as Stripe.Customer;

    if ("skipWebhook" in subscription.metadata) {
      console.warn(
        `Skipping webhook for subscription ${subscription.id} because skipWebhook is in the metadata`,
      );
      return;
    }

    const newProduct = subscription.metadata.new_product_when_canceled;
    const newLicensePeriod = subscription.metadata
      .new_billing_cycle_when_canceled;

    if (
      !newProduct || !newLicensePeriod
    ) {
      console.warn(
        `Subscription ${subscription.id} has no new product or license period in the metadata, so we will not create a new subscription`,
      );
      return;
    }

    if (![BASIC_PRODUCT, PRO_PRODUCT, PREMIUM_PRODUCT].includes(newProduct)) {
      throw new Error(`Invalid product: ${newProduct}`);
    }

    if (
      ![MONTHLY_BILLING_CYCLE, YEARLY_BILLING_CYCLE].includes(newLicensePeriod)
    ) {
      throw new Error(`Invalid license period: ${newLicensePeriod}`);
    }

    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("stripe_customer_id", "=", customer.id)
      .executeTakeFirstOrThrow();

    const stripeService = new StripeService();

    const newSubscription = await stripeService.createSubscription(
      customer.id,
      newProduct as StripeProduct,
      newLicensePeriod as StripeBillingCycle,
    );

    const accessEnabled = shouldHaveAccess(newSubscription.status);

    await db
      .updateTable("organization")
      .set({
        stripe_product: newProduct as StripeProduct,
        stripe_billing_cycle: newLicensePeriod as StripeBillingCycle,
        access_enabled: accessEnabled,
      })
      .where("id", "=", organization.id)
      .execute();
  }

  private async handleSubscriptionCreatedOrUpdated(
    event:
      | Stripe.CustomerSubscriptionCreatedEvent
      | Stripe.CustomerSubscriptionUpdatedEvent,
  ) {
    const subscription = event.data.object;
    const customer = subscription.customer as Stripe.Customer;

    const accessEnabled = shouldHaveAccess(subscription.status);

    await db
      .updateTable("organization")
      .set({
        access_enabled: accessEnabled,
      })
      .where("stripe_customer_id", "=", customer.id)
      .execute();
  }
}
