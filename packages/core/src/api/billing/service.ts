import { type Context, Status } from "@oak/oak";
import { db } from "../../db/database.ts";
import { StripeService } from "../../stripe/index.ts";
import type { Stripe } from "stripe";
import { shouldHaveAccess } from "../../db/models/workspace.ts";
import {
  sendSubscriptionDowngradedEmail,
  sendSubscriptionUpgradedEmail,
} from "../../email/index.ts";
import settings from "../../settings.ts";
import {
  type billingApiTypes,
  memberTypes,
  stripeTypes,
} from "@stackcore/shared";

const notAMemberOfWorkspaceError = "not_a_member_of_workspace";
const notAnAdminError = "not_an_admin";
const cannotChangeCustomProductError = "cannot_change_custom_product";
const cannotUpgradeToInferiorProductError =
  "cannot_upgrade_to_inferior_product";
const cannotDowngradeToSuperiorProductError =
  "cannot_downgrade_to_superior_product";
const cannotChangeToSameProductAndBillingCycleError =
  "cannot_change_to_same_product_and_billing_cycle";
const couldNotChangeSubscriptionError = "could_not_change_subscription";
const cannotUpgradeWithoutDefaultPaymentMethodError =
  "cannot_upgrade_without_default_payment_method";

export class BillingService {
  public async getSubscription(
    userId: number,
    workspaceId: number,
  ): Promise<
    { subscription?: billingApiTypes.SubscriptionDetails; error?: string }
  > {
    const isMember = await db
      .selectFrom("member")
      .select("user_id")
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspaceId)
      .executeTakeFirstOrThrow();

    if (!workspace.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();

    const customer = await stripeService.getCustomer(
      workspace.stripe_customer_id,
    );

    let hasDefaultPaymentMethod = false;
    if (typeof customer === "object" && "invoice_settings" in customer) {
      hasDefaultPaymentMethod =
        customer.invoice_settings.default_payment_method !== null;
    }

    const subscription = await stripeService.getCustomerSubscription(
      workspace.stripe_customer_id,
    );

    const currentUsage = await stripeService.getCurrentUsage(
      workspace.stripe_customer_id,
      subscription,
    );

    if (subscription.items.data.length !== 1) {
      throw new Error("Subscription has multiple items");
    }

    const priceId = subscription.items.data[0].price.id;

    const priceIdMap = {
      [settings.STRIPE.PRODUCTS.BASIC.MONTHLY.PRICE_ID]: {
        product: stripeTypes.BASIC_PRODUCT as stripeTypes.StripeProduct,
        billingCycle: stripeTypes
          .MONTHLY_BILLING_CYCLE as stripeTypes.StripeBillingCycle,
      },
      [settings.STRIPE.PRODUCTS.PRO.MONTHLY.PRICE_ID]: {
        product: stripeTypes.PRO_PRODUCT as stripeTypes.StripeProduct,
        billingCycle: stripeTypes
          .MONTHLY_BILLING_CYCLE as stripeTypes.StripeBillingCycle,
      },
      [settings.STRIPE.PRODUCTS.PRO.YEARLY.PRICE_ID]: {
        product: stripeTypes.PRO_PRODUCT as stripeTypes.StripeProduct,
        billingCycle: stripeTypes
          .YEARLY_BILLING_CYCLE as stripeTypes.StripeBillingCycle,
      },
      [
        settings.STRIPE.PRODUCTS.PREMIUM.MONTHLY.PRICE_ID
      ]: {
        product: stripeTypes.PREMIUM_PRODUCT as stripeTypes.StripeProduct,
        billingCycle: stripeTypes
          .MONTHLY_BILLING_CYCLE as stripeTypes.StripeBillingCycle,
      },
      [
        settings.STRIPE.PRODUCTS.PREMIUM.YEARLY.PRICE_ID
      ]: {
        product: stripeTypes.PREMIUM_PRODUCT as stripeTypes.StripeProduct,
        billingCycle: stripeTypes
          .YEARLY_BILLING_CYCLE as stripeTypes.StripeBillingCycle,
      },
    };

    const productInfo = priceIdMap[priceId];

    if (!productInfo) {
      const subscriptionDetails: billingApiTypes.SubscriptionDetails = {
        currentUsage,
        product: stripeTypes.CUSTOM_PRODUCT,
        billingCycle: null,
        hasDefaultPaymentMethod,
        cancelAt: null,
        newProductWhenCanceled: null,
        newBillingCycleWhenCanceled: null,
      };

      return { subscription: subscriptionDetails };
    }

    const cancelAt = subscription.cancel_at;
    let newProductWhenCanceled: stripeTypes.StripeProduct | null = null;
    let newBillingCycleWhenCanceled: stripeTypes.StripeBillingCycle | null =
      null;
    if (cancelAt) {
      newProductWhenCanceled = subscription.metadata
        .new_product_when_canceled as stripeTypes.StripeProduct || null;
      newBillingCycleWhenCanceled = subscription.metadata
        .new_billing_cycle_when_canceled as stripeTypes.StripeBillingCycle ||
        null;
    }

    const subscriptionDetails: billingApiTypes.SubscriptionDetails = {
      currentUsage,
      product: productInfo.product,
      billingCycle: productInfo.billingCycle,
      hasDefaultPaymentMethod,
      cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
      newProductWhenCanceled,
      newBillingCycleWhenCanceled,
    };

    return {
      subscription: subscriptionDetails,
    };
  }

  public async getPortalSession(
    userId: number,
    workspaceId: number,
    returnUrl: string,
  ): Promise<{ url?: string; error?: string }> {
    const isMember = await db
      .selectFrom("member")
      .select("user_id")
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspaceId)
      .executeTakeFirstOrThrow();

    if (!workspace.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();
    const session = await stripeService.getPortalSession(
      workspace.stripe_customer_id,
      returnUrl,
    );

    return {
      url: session.url,
    };
  }

  public async updatePaymentMethod(
    userId: number,
    workspaceId: number,
    returnUrl: string,
  ): Promise<{ url?: string; error?: string }> {
    const isMember = await db
      .selectFrom("member")
      .select("user_id")
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspaceId)
      .executeTakeFirstOrThrow();

    if (!workspace.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();
    const session = await stripeService.updatePaymentMethod(
      workspace.stripe_customer_id,
      returnUrl,
    );

    return {
      url: session.url,
    };
  }

  public async upgradeSubscription(
    userId: number,
    workspaceId: number,
    product: stripeTypes.StripeProduct,
    billingCycle: stripeTypes.StripeBillingCycle,
  ): Promise<{ error?: string }> {
    const isMember = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select(["user_id", "role"])
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    if (isMember.role !== memberTypes.ADMIN_ROLE) {
      return { error: notAnAdminError };
    }

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspaceId)
      .executeTakeFirstOrThrow();

    const { subscription: currentSubscription, error } = await this
      .getSubscription(userId, workspaceId);
    if (error || !currentSubscription) {
      return { error };
    }

    if (!currentSubscription.hasDefaultPaymentMethod) {
      return { error: cannotUpgradeWithoutDefaultPaymentMethodError };
    }

    // Check if user is upgrading to a superior product
    switch (currentSubscription.product) {
      case stripeTypes.CUSTOM_PRODUCT:
        return { error: cannotChangeCustomProductError };
      case stripeTypes.PREMIUM_PRODUCT:
        if (
          [stripeTypes.BASIC_PRODUCT, stripeTypes.PRO_PRODUCT].includes(product)
        ) {
          return { error: cannotUpgradeToInferiorProductError };
        }
        break;
      case stripeTypes.PRO_PRODUCT:
        if ([stripeTypes.BASIC_PRODUCT].includes(product)) {
          return { error: cannotUpgradeToInferiorProductError };
        }
        break;
    }

    // Check if user is upgrading to a superior billing cycle
    if (currentSubscription.product === product) {
      switch (currentSubscription.billingCycle) {
        case stripeTypes.YEARLY_BILLING_CYCLE:
          if (billingCycle === stripeTypes.MONTHLY_BILLING_CYCLE) {
            return { error: cannotUpgradeToInferiorProductError };
          }
          break;
      }
    }

    // Check if user is upgrading to the same product and billing cycle
    if (
      currentSubscription.product === product &&
      currentSubscription.billingCycle === billingCycle
    ) {
      return { error: cannotChangeToSameProductAndBillingCycleError };
    }

    if (!workspace.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();

    try {
      await stripeService.switchSubscription(
        workspace.stripe_customer_id,
        product,
        billingCycle,
        null,
        "upgrade",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.warn(
        "Failed to upgrade subscription:",
        message,
      );
      return { error: couldNotChangeSubscriptionError };
    }

    const oldSubscription = {
      product: currentSubscription.product,
      billingCycle: currentSubscription.billingCycle,
    };

    const newSubscription = {
      product,
      billingCycle,
    };

    // Send email to all adminss
    const emails = await db
      .selectFrom("user")
      .select("email")
      .innerJoin(
        "member",
        "member.user_id",
        "user.id",
      )
      .where("member.workspace_id", "=", workspaceId)
      .where("member.role", "=", memberTypes.ADMIN_ROLE)
      .execute();

    await sendSubscriptionUpgradedEmail({
      emails: emails.map((e) => e.email),
      workspaceName: workspace.name,
      oldSubscription,
      newSubscription,
    });

    return {};
  }

  public async downgradeSubscription(
    userId: number,
    workspaceId: number,
    product: stripeTypes.StripeProduct,
    billingCycle: stripeTypes.StripeBillingCycle,
  ) {
    const isMember = await db
      .selectFrom("member")
      .innerJoin(
        "workspace",
        "workspace.id",
        "member.workspace_id",
      )
      .select(["user_id", "role"])
      .where("user_id", "=", userId)
      .where("workspace_id", "=", workspaceId)
      .where("workspace.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfWorkspaceError };
    }

    if (isMember.role !== memberTypes.ADMIN_ROLE) {
      return { error: notAnAdminError };
    }

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspaceId)
      .executeTakeFirstOrThrow();

    const { subscription: currentSubscription, error } = await this
      .getSubscription(userId, workspaceId);
    if (error || !currentSubscription) {
      return { error };
    }

    // check if user is downgrading to an inferior product
    switch (currentSubscription.product) {
      case stripeTypes.CUSTOM_PRODUCT:
        return { error: cannotChangeCustomProductError };
      case stripeTypes.PRO_PRODUCT:
        if ([stripeTypes.PREMIUM_PRODUCT].includes(product)) {
          return { error: cannotDowngradeToSuperiorProductError };
        }
        break;
      case stripeTypes.BASIC_PRODUCT:
        if (
          [stripeTypes.PRO_PRODUCT, stripeTypes.PREMIUM_PRODUCT].includes(
            product,
          )
        ) {
          return { error: cannotDowngradeToSuperiorProductError };
        }
        break;
    }

    // Check if the user is downgrading to an inferior billing cycle
    if (currentSubscription.product === product) {
      switch (currentSubscription.billingCycle) {
        case stripeTypes.MONTHLY_BILLING_CYCLE:
          if (billingCycle === stripeTypes.YEARLY_BILLING_CYCLE) {
            return { error: cannotDowngradeToSuperiorProductError };
          }
          break;
        case stripeTypes.YEARLY_BILLING_CYCLE:
          // this is allowed
          break;
      }
    }

    // Check if the user is downgrading to the same product and billing cycle
    if (
      currentSubscription.product === product &&
      currentSubscription.billingCycle === billingCycle
    ) {
      return { error: cannotChangeToSameProductAndBillingCycleError };
    }

    if (!workspace.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();

    try {
      await stripeService.switchSubscription(
        workspace.stripe_customer_id,
        product,
        billingCycle,
        null,
        "downgrade",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.warn(
        "Failed to downgrade subscription:",
        message,
      );
      return { error: couldNotChangeSubscriptionError };
    }

    const oldSubscription = {
      product: currentSubscription.product,
      billingCycle: currentSubscription.billingCycle,
    };

    const newSubscription = {
      product,
      billingCycle,
    };

    // Send email to all admins
    const emails = await db
      .selectFrom("user")
      .select("email")
      .innerJoin(
        "member",
        "member.user_id",
        "user.id",
      )
      .where("member.workspace_id", "=", workspaceId)
      .where("member.role", "=", memberTypes.ADMIN_ROLE)
      .execute();

    const newSubscriptionDate = currentSubscription.cancelAt
      ? currentSubscription.cancelAt.toISOString()
      : "unknown";

    await sendSubscriptionDowngradedEmail({
      emails: emails.map((e) => e.email),
      workspaceName: workspace.name,
      oldSubscription,
      newSubscription,
      newSubscriptionDate,
    });

    return {};
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

    const event = await stripeService.getWebhookEvent(bodyText, signature);

    switch (event.type) {
      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event);
        console.info(
          `Subscription ${event.data.object.id} deleted`,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionCreatedOrUpdated(event);
        console.info(
          `Subscription ${event.data.object.id} created or updated`,
        );
        break;
      case "customer.updated":
        await this.handleCustomerUpdated(event);
        console.info(
          `Customer ${event.data.object.id} updated`,
        );
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

    if (
      ![
        stripeTypes.BASIC_PRODUCT,
        stripeTypes.PRO_PRODUCT,
        stripeTypes.PREMIUM_PRODUCT,
      ].includes(newProduct)
    ) {
      throw new Error(`Invalid product: ${newProduct}`);
    }

    if (
      ![stripeTypes.MONTHLY_BILLING_CYCLE, stripeTypes.YEARLY_BILLING_CYCLE]
        .includes(newLicensePeriod)
    ) {
      throw new Error(`Invalid license period: ${newLicensePeriod}`);
    }

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("stripe_customer_id", "=", customer.id)
      .executeTakeFirstOrThrow();

    const stripeService = new StripeService();

    const newSubscription = await stripeService.createSubscription(
      customer.id,
      newProduct as stripeTypes.StripeProduct,
      newLicensePeriod as stripeTypes.StripeBillingCycle,
      null,
    );

    const accessEnabled = shouldHaveAccess(newSubscription.status);

    await db
      .updateTable("workspace")
      .set({
        access_enabled: accessEnabled,
      })
      .where("id", "=", workspace.id)
      .execute();
  }

  private async handleSubscriptionCreatedOrUpdated(
    event:
      | Stripe.CustomerSubscriptionCreatedEvent
      | Stripe.CustomerSubscriptionUpdatedEvent,
  ) {
    const subscription = event.data.object;
    const customer = subscription.customer;

    if (typeof customer === "string") {
      console.error(
        `Skipping webhook for subscription ${subscription.id} because customer is a string, this should not happen`,
      );
      return;
    }

    const accessEnabled = shouldHaveAccess(subscription.status);

    const stripeService = new StripeService();

    await db
      .updateTable("workspace")
      .set({
        access_enabled: accessEnabled,
      })
      .where("stripe_customer_id", "=", customer.id)
      .execute();

    if (
      subscription.items.data.some((item) => item.billing_thresholds) &&
      subscription.default_payment_method
    ) {
      await stripeService.removeBillingThresholdFromSubscription(subscription);
    }
  }

  private async handleCustomerUpdated(
    event: Stripe.CustomerUpdatedEvent,
  ) {
    const customer = event.data.object;

    const stripeService = new StripeService();
    const subscription = await stripeService.getCustomerSubscription(
      customer.id,
    );

    const accessEnabled = shouldHaveAccess(subscription.status);

    await db
      .updateTable("workspace")
      .set({
        access_enabled: accessEnabled,
      })
      .where("stripe_customer_id", "=", customer.id)
      .execute();

    if (
      subscription.items.data.some((item) => item.billing_thresholds) &&
      subscription.default_payment_method
    ) {
      await stripeService.removeBillingThresholdFromSubscription(subscription);
    }
  }
}
