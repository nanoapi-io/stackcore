import stripe from "stripe";
import settings from "@stackcore/settings";
import { BillingApiTypes } from "@stackcore/coreApiTypes";

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
    workspaceId: number,
    workspaceName: string,
  ) {
    const customer = await this.stripe.customers.create({
      metadata: {
        workspace_id: workspaceId,
        workspace_name: workspaceName,
      },
    });

    return customer;
  }

  private getStandardStripeProductPriceId(
    product: BillingApiTypes.StripeProduct,
    billingCycle: BillingApiTypes.StripeBillingCycle,
  ) {
    if (product === BillingApiTypes.STRIPE_BASIC_PRODUCT) {
      if (billingCycle === BillingApiTypes.STRIPE_MONTHLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS.BASIC.MONTHLY.PRICE_ID;
      }
    }

    if (product === BillingApiTypes.STRIPE_PRO_PRODUCT) {
      if (billingCycle === BillingApiTypes.STRIPE_MONTHLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS.PRO.MONTHLY.PRICE_ID;
      }
      if (billingCycle === BillingApiTypes.STRIPE_YEARLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS.PRO.YEARLY.PRICE_ID;
      }
    }

    if (product === BillingApiTypes.STRIPE_PREMIUM_PRODUCT) {
      if (billingCycle === BillingApiTypes.STRIPE_MONTHLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS.PREMIUM.MONTHLY.PRICE_ID;
      }
      if (billingCycle === BillingApiTypes.STRIPE_YEARLY_BILLING_CYCLE) {
        return settings.STRIPE.PRODUCTS.PREMIUM.YEARLY.PRICE_ID;
      }
    }

    // assume custom product, no price id
    throw new Error("Could not determine price ID");
  }

  public async createSubscription(
    stripeCustomerId: string,
    product: BillingApiTypes.StripeProduct,
    licensePeriod: BillingApiTypes.StripeBillingCycle,
    billingThreshold: number | null,
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
          billing_thresholds: billingThreshold
            ? {
              usage_gte: billingThreshold,
            }
            : undefined,
        },
      ],
    });

    return subscription;
  }

  public async getCustomer(stripeCustomerId: string) {
    const customer = await this.stripe.customers.retrieve(stripeCustomerId);
    return customer;
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
    product: BillingApiTypes.StripeProduct,
    licensePeriod: BillingApiTypes.StripeBillingCycle,
    billingThreshold: number | null,
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
            billing_thresholds: billingThreshold
              ? {
                usage_gte: billingThreshold,
              }
              : undefined,
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

  public async setBillingThresholdForSubscription(
    subscription: stripe.Subscription,
    billingThreshold: number,
  ) {
    await this.stripe.subscriptions.update(subscription.id, {
      items: subscription.items.data.map((item) => ({
        id: item.id,
        billing_thresholds: {
          usage_gte: billingThreshold,
        },
      })),
    });
  }

  public async removeBillingThresholdFromSubscription(
    subscription: stripe.Subscription,
  ) {
    await this.stripe.subscriptions.update(subscription.id, {
      items: subscription.items.data.map((item) => ({
        id: item.id,
        billing_thresholds: undefined,
      })),
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

  public async getCurrentUsage(
    stripeCustomerId: string,
    subscription: stripe.Subscription,
  ) {
    const startTime = new Date(
      subscription.items.data[0].current_period_start * 1000,
    );
    startTime.setUTCDate(startTime.getUTCDate());
    startTime.setUTCHours(0, 0, 0, 0);
    const startTimeTimestamp = Math.floor(startTime.getTime() / 1000);

    const endTime = new Date(
      subscription.items.data[0].current_period_end * 1000,
    );
    endTime.setUTCDate(endTime.getUTCDate());
    endTime.setUTCHours(0, 0, 0, 0);
    const endTimeTimestamp = Math.floor(endTime.getTime() / 1000);

    const eventSummaries = await this.stripe.billing.meters
      .listEventSummaries(
        settings.STRIPE.METER.CREDIT_USAGE_METER_ID,
        {
          customer: stripeCustomerId,
          start_time: startTimeTimestamp,
          end_time: endTimeTimestamp,
        },
      );

    let totalUsage = 0;
    for (const eventSummary of eventSummaries.data) {
      totalUsage += eventSummary.aggregated_value;
    }

    return totalUsage;
  }

  /*
  subscriptionStatus: The status of the subscription in Stripe
  Returns true if the workspace should have access, false otherwise
  */
  public shouldHaveAccess(
    subscriptionStatus: stripe.Subscription.Status,
  ) {
    switch (subscriptionStatus) {
      // All good
      case "active":
      // trial period, all good
      case "trialing":
      // invoice cannot be paid,
      // after 23h will move to incomplete_expired, where we will block access
      case "incomplete":
        return true;
      // this will move to unpaid eventually,
      // once stripe has exhausted all retry (can be configured)
      case "past_due":
      // most likely user changed their subscription.
      // We block access, when new subscription is created,
      // another event is triggered and access is restored
      case "canceled":
      // Subscription paused from dashboard, we block access
      case "paused":
      // Stripe cannot pay the invoice, we block access
      case "unpaid":
      // Invoice expired, we block access
      case "incomplete_expired":
        return false;

      // Should not happen
      default:
        throw new Error(`Unknown subscription status: ${subscriptionStatus}`);
    }
  }
}
