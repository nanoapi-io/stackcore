import stripe from "stripe";
import settings from "../settings.ts";
import type { Body } from "@oak/oak/body";
import { db } from "../db/database.ts";
import type { Organization } from "../db/types.ts";
import { Status } from "@oak/oak";

export function getStripe() {
  if (settings.STRIPE.USE_MOCK) {
    return new stripe(settings.STRIPE.SECRET_KEY, {
      protocol: "http",
      host: "localhost",
      port: 12111,
    });
  }
  return new stripe(settings.STRIPE.SECRET_KEY);
}

export class StripeService {
  private stripe: stripe;

  constructor() {
    this.stripe = getStripe();
  }

  public async createCustomer(organization: Organization) {
    const customer = await this.stripe.customers.create({
      metadata: {
        organization_id: organization.id,
      },
    });

    return customer;
  }

  public async sendUsageEvent(
    organization: Organization,
    amount: number,
  ) {
    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    await this.stripe.billing.meterEvents.create({
      event_name: settings.STRIPE.CREDIT_USAGE_METER_EVENT_NAME,
      payload: {
        stripe_customer_id: organization.stripe_customer_id,
        value: amount.toString(),
      },
    });
  }

  public async createBillingPortalSession(
    organization: Organization,
    returnUrl: string,
  ) {
    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: returnUrl,
    });

    return session;
  }

  public async handleWebhook(body: Body, signature?: string) {
    let event: stripe.Event;

    if (signature) {
      try {
        event = this.stripe.webhooks.constructEvent(
          await body.text(),
          signature,
          settings.STRIPE.WEBHOOK_SECRET,
        );
      } catch (error) {
        if (error instanceof stripe.errors.StripeSignatureVerificationError) {
          console.warn("Invalid signature received", error);
          return {
            status: Status.Forbidden,
            body: "Invalid signature",
          };
        }

        throw error;
      }
    } else {
      event = await body.json() as stripe.Event;
    }

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await this.handleCustomerSubscriptionCreatedOrUpdatedEvent(
          event,
        );
        break;
      default:
        console.info(`Unhandled event type ${event.type}`);
    }

    return {
      status: 200,
      body: "Event received",
    };
  }

  private async handleCustomerSubscriptionCreatedOrUpdatedEvent(
    event:
      | stripe.CustomerSubscriptionUpdatedEvent
      | stripe.CustomerSubscriptionCreatedEvent,
  ) {
    const stripeCustomerId = event.data.object.id;

    let accessEnabled = false;

    switch (event.data.object.status) {
      case "active":
      case "trialing":
        accessEnabled = true;
        break;
      case "incomplete":
      case "incomplete_expired":
      case "past_due":
      case "unpaid":
        accessEnabled = false;
        break;
    }

    await db.updateTable("organization")
      .set({
        access_enabled: accessEnabled,
      })
      .where("stripe_customer_id", "=", stripeCustomerId)
      .executeTakeFirstOrThrow();
  }
}
