import stripe from "stripe";
import settings from "../settings.ts";
import type {
  StripeBillingCycle,
  StripeProduct,
} from "../db/models/organization.ts";

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
    product: StripeProduct,
    licensePeriod: StripeBillingCycle,
  ) {
    const licensePriceId = settings.STRIPE.PRODUCTS[product]
      .LICENSE_PRICE_ID[licensePeriod];

    const meterPriceId =
      settings.STRIPE.PRODUCTS[product].MONTHLY_METER_PRICE_ID;

    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: licensePriceId,
          metadata: {
            product: product,
            type: "license",
            billing_cycle: licensePeriod,
          },
        },
        {
          price: meterPriceId,
          metadata: {
            product: product,
            type: "usage",
            billing_cycle: licensePeriod,
          },
        },
      ],
    });

    return subscription;
  }

  public async switchSubscription(
    stripeCustomerId: string,
    product: StripeProduct,
    licensePeriod: StripeBillingCycle,
    switchMethod: "upgrade" | "downgrade",
  ) {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    const currentLicensePriceId = subscription.items.data.find((item) => {
      item.metadata.type === "license";
    })?.price.id;

    if (!currentLicensePriceId) {
      throw new Error(
        "Current license price ID is not set in stripe metadata",
      );
    }

    const currentMeterPriceId = subscription.items.data.find((item) => {
      item.metadata.type === "usage";
    })?.price.id;

    if (!currentMeterPriceId) {
      throw new Error(
        "Current meter price ID is not set in stripe metadata",
      );
    }

    const newLicensePriceId =
      settings.STRIPE.PRODUCTS[product].LICENSE_PRICE_ID[licensePeriod];

    const newMeterPriceId =
      settings.STRIPE.PRODUCTS[product].MONTHLY_METER_PRICE_ID;

    if (switchMethod === "upgrade") {
      await this.stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: currentLicensePriceId,
            price: newLicensePriceId,
            metadata: {
              product: product,
              type: "license",
              billing_cycle: licensePeriod,
            },
          },
          {
            id: currentMeterPriceId,
            price: newMeterPriceId,
            metadata: {
              product: product,
              type: "usage",
              billing_cycle: licensePeriod,
            },
          },
        ],
        // Do not prorate the new price, instead we start new billing cycle immediately
        proration_behavior: "none",
        // Change the billing cycle to the new period
        // This will create an invoice immediately for the old subscription
        // and will create a new subscription with the new price from now
        billing_cycle_anchor: "now",
      });
    } else if (switchMethod === "downgrade") {
      await this.stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
        metadata: {
          new_product_when_canceled: product,
          new_billing_cycle_when_canceled: licensePeriod,
        },
      });
    } else {
      throw new Error("Invalid switch method", { cause: switchMethod });
    }
  }

  public async cancelSubscription(stripeCustomerId: string) {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    await this.stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
      metadata: {
        new_product_when_canceled: null,
        new_billing_cycle_when_canceled: null,
      },
    });
  }

  public async sendUsageEvent(
    stripeCustomerId: string,
    amount: number,
  ) {
    if (!stripeCustomerId) {
      throw new Error("Stripe customer ID is not set");
    }

    await this.stripe.billing.meterEvents.create({
      event_name: settings.STRIPE.METER.CREDIT_USAGE_EVENT_NAME,
      payload: {
        stripe_customer_id: stripeCustomerId,
        value: amount.toString(),
      },
    });
  }

  public async updatePaymentMethod(
    stripeCustomerId: string,
    returnUrl: string,
  ) {
    if (!stripeCustomerId) {
      throw new Error("Stripe customer ID is not set");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      flow_data: {
        type: "payment_method_update",
      },
      return_url: returnUrl,
    });

    return session;
  }

  public getWebhookEvent(bodyText: string, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      bodyText,
      signature,
      settings.STRIPE.WEBHOOK_SECRET,
    );

    return event;
  }
}
