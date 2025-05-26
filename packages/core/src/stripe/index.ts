import stripe from "stripe";
import settings from "../settings.ts";
import {
  BASIC_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  type StripeBillingCycle,
  type StripeProduct,
  YEARLY_BILLING_CYCLE,
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

  private getStandardStripeProductPriceId(
    product: StripeProduct,
    billingCycle: StripeBillingCycle,
  ) {
    if (product === BASIC_PRODUCT) {
      if (billingCycle === MONTHLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS[BASIC_PRODUCT][MONTHLY_BILLING_CYCLE]
          .PRICE_ID;
      }
    }

    if (product === PRO_PRODUCT) {
      if (billingCycle === MONTHLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS[PRO_PRODUCT][MONTHLY_BILLING_CYCLE]
          .PRICE_ID;
      }
      if (billingCycle === YEARLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS[PRO_PRODUCT][YEARLY_BILLING_CYCLE]
          .PRICE_ID;
      }
    }

    if (product === PREMIUM_PRODUCT) {
      if (billingCycle === MONTHLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS[PREMIUM_PRODUCT][MONTHLY_BILLING_CYCLE]
          .PRICE_ID;
      }
      if (billingCycle === YEARLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS[PREMIUM_PRODUCT][YEARLY_BILLING_CYCLE]
          .PRICE_ID;
      }
    }

    // assume custom product, no price id
    throw new Error("Could not determine price ID");
  }

  public async createSubscription(
    stripeCustomerId: string,
    product: StripeProduct,
    licensePeriod: StripeBillingCycle,
  ) {
    const priceId = this.getStandardStripeProductPriceId(
      product,
      licensePeriod,
    );

    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: priceId,
        },
      ],
    });

    return subscription;
  }

  public async getCustomerSubscription(stripeCustomerId: string) {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: stripeCustomerId,
      limit: 1,
    });

    const subscription = subscriptions.data[0];

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return subscription;
  }

  public async switchSubscription(
    stripeCustomerId: string,
    product: StripeProduct,
    licensePeriod: StripeBillingCycle,
    switchMethod: "upgrade" | "downgrade",
  ) {
    const subscription = await this.getCustomerSubscription(stripeCustomerId);

    if (subscription.items.data.length !== 1) {
      throw new Error("Subscription has multiple items");
    }

    const existingItemId = subscription.items.data[0].id;

    const newPriceId = this.getStandardStripeProductPriceId(
      product,
      licensePeriod,
    );

    if (switchMethod === "upgrade") {
      await this.stripe.subscriptions.update(subscription.id, {
        // make sure the subscription is not canceled, could have been the case if previously downgraded
        cancel_at_period_end: false,
        items: [
          {
            id: existingItemId,
            price: newPriceId,
          },
        ],
        // Do not prorate the new price, instead we start new billing cycle immediately
        proration_behavior: "none",
        // Change the billing cycle to the new period
        // This will create an invoice immediately for the old subscription
        // and will create a new subscription with the new price from now
        billing_cycle_anchor: "now",
        metadata: {
          new_product_when_canceled: null,
          new_billing_cycle_when_canceled: null,
        },
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
    const subscription = await this.getCustomerSubscription(stripeCustomerId);

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

  public async getPortalSession(
    stripeCustomerId: string,
    returnUrl: string,
  ) {
    if (!stripeCustomerId) {
      throw new Error("Stripe customer ID is not set");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return session;
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

  public async getWebhookEvent(bodyText: string, signature: string) {
    const event = await this.stripe.webhooks.constructEventAsync(
      bodyText,
      signature,
      settings.STRIPE.WEBHOOK_SECRET,
    );

    return event;
  }
}
