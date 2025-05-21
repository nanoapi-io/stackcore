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

  public async createCustomer(
    organizationId: number,
    organizationName: string,
  ) {
    const customer = await this.stripe.customers.create({
      metadata: {
        organization_id: organizationId,
        organization_name: organizationName,
      },
    });

    return customer;
  }

  public async createSubscription(
    stripeCustomerId: string,
    product: "BASIC" | "PRO" | "PREMIUM",
    licensePeriod: "MONTHLY" | "YEARLY",
  ) {
    const licensePriceId =
      settings.STRIPE.PRODUCTS[product].LICENSE_PRICE_ID[licensePeriod];

    const meterPriceId =
      settings.STRIPE.PRODUCTS[product].MONTHLY_METER_PRICE_ID;

    await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: licensePriceId,
        },
        {
          price: meterPriceId,
        },
      ],
    });
  }

  public async switchSubscription(
    organization: Organization,
    product: "BASIC" | "PRO" | "PREMIUM",
    licensePeriod: "MONTHLY" | "YEARLY",
  ) {
    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const subscriptions = await this.stripe.subscriptions.list({
      customer: organization.stripe_customer_id,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    const licensePriceId =
      settings.STRIPE.PRODUCTS[product].LICENSE_PRICE_ID[licensePeriod];

    const meterPriceId =
      settings.STRIPE.PRODUCTS[product].MONTHLY_METER_PRICE_ID;

    await this.stripe.subscriptions.update(subscription.id, {
      items: [
        {
          price: licensePriceId,
        },
        {
          price: meterPriceId,
        },
      ],
    });
  }

  public async cancelSubscription(
    stripeCustomerId: string,
  ) {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    await this.stripe.subscriptions.cancel(subscription.id, {
      invoice_now: true,
      prorate: false,
    });
  }

  public async sendUsageEvent(
    organization: Organization,
    amount: number,
  ) {
    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    await this.stripe.billing.meterEvents.create({
      event_name: settings.STRIPE.METER.CREDIT_USAGE_EVENT_NAME,
      payload: {
        stripe_customer_id: organization.stripe_customer_id,
        value: amount.toString(),
      },
    });
  }

  public async updateSubscription(
    organization: Organization,
    returnUrl: string,
  ) {
    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const subscriptions = await this.stripe.subscriptions.list({
      customer: organization.stripe_customer_id,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: organization.stripe_customer_id,
        // flow_data: {
        //   type: "subscription_update",
        //   subscription_update: {
        //     subscription: subscription.id,
        //   },
        // },
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async updatePaymentMethod(
    organization: Organization,
    returnUrl: string,
  ) {
    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      flow_data: {
        type: "payment_method_update",
      },
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
