import { type Context, Status } from "@oak/oak";
import { db } from "../../db/database.ts";
import { StripeService } from "../../stripe/index.ts";
import type { Stripe } from "stripe";
import {
  BASIC_PRODUCT,
  CUSTOM_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  type StripeBillingCycle,
  type StripeProduct,
  YEARLY_BILLING_CYCLE,
} from "../../db/models/organization.ts";
import { shouldHaveAccess } from "../../db/models/organization.ts";
import { ADMIN_ROLE } from "../../db/models/organizationMember.ts";
import {
  sendSubscriptionDowngradedEmail,
  sendSubscriptionUpgradedEmail,
} from "../../email/index.ts";

const notAMemberOfOrganizationError = "not_a_member_of_organization";
const notAnAdminError = "not_an_admin";
const cannotChangeCustomProductError = "cannot_change_custom_product";
const cannotUpgradeToInferiorProductError =
  "cannot_upgrade_to_inferior_product";
const cannotDowngradeToSuperiorProductError =
  "cannot_downgrade_to_superior_product";
const cannotChangeToSameProductAndBillingCycleError =
  "cannot_change_to_same_product_and_billing_cycle";

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

  public async upgradeSubscription(
    userId: number,
    organizationId: number,
    product: StripeProduct,
    billingCycle: StripeBillingCycle,
  ): Promise<{ error?: string }> {
    const isMember = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select(["user_id", "role"])
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfOrganizationError };
    }

    if (isMember.role !== ADMIN_ROLE) {
      return { error: notAnAdminError };
    }

    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .executeTakeFirstOrThrow();

    if (!organization.stripe_product || !organization.stripe_billing_cycle) {
      throw new Error("Stripe product or billing cycle is not set");
    }

    // Check if user is upgrading to a superior product
    switch (organization.stripe_product) {
      case CUSTOM_PRODUCT:
        return { error: cannotChangeCustomProductError };
      case PREMIUM_PRODUCT:
        if (![BASIC_PRODUCT, PRO_PRODUCT].includes(product)) {
          return { error: cannotUpgradeToInferiorProductError };
        }
        break;
      case PRO_PRODUCT:
        if (![BASIC_PRODUCT].includes(product)) {
          return { error: cannotUpgradeToInferiorProductError };
        }
        break;
    }

    // Check if user is upgrading to a superior billing cycle
    if (organization.stripe_product === product) {
      switch (organization.stripe_billing_cycle) {
        case YEARLY_BILLING_CYCLE:
          if (billingCycle === MONTHLY_BILLING_CYCLE) {
            return { error: cannotUpgradeToInferiorProductError };
          }
          break;
      }
    }

    // Check if user is upgrading to the same product and billing cycle
    if (
      organization.stripe_product === product &&
      organization.stripe_billing_cycle === billingCycle
    ) {
      return { error: cannotChangeToSameProductAndBillingCycleError };
    }

    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();
    await stripeService.switchSubscription(
      organization.stripe_customer_id,
      product,
      billingCycle,
      "upgrade",
    );

    const oldSubscription = {
      product: organization.stripe_product,
      billingCycle: organization.stripe_billing_cycle,
    };

    const newSubscription = {
      product,
      billingCycle,
    };

    await db
      .updateTable("organization")
      .set({
        stripe_product: product,
        stripe_billing_cycle: billingCycle,
      })
      .where("id", "=", organizationId)
      .execute();

    // Send email to all adminss
    const emails = await db
      .selectFrom("user")
      .select("email")
      .innerJoin(
        "organization_member",
        "organization_member.user_id",
        "user.id",
      )
      .where("organization_member.organization_id", "=", organizationId)
      .where("organization_member.role", "=", ADMIN_ROLE)
      .execute();

    for (const email of emails) {
      sendSubscriptionUpgradedEmail({
        email: email.email,
        organizationName: organization.name,
        oldSubscription,
        newSubscription,
      });
    }

    return {};
  }

  public async downgradeSubscription(
    userId: number,
    organizationId: number,
    product: StripeProduct,
    billingCycle: StripeBillingCycle,
  ) {
    const isMember = await db
      .selectFrom("organization_member")
      .innerJoin(
        "organization",
        "organization.id",
        "organization_member.organization_id",
      )
      .select(["user_id", "role"])
      .where("user_id", "=", userId)
      .where("organization_id", "=", organizationId)
      .where("organization.deactivated", "=", false)
      .executeTakeFirst();

    if (!isMember) {
      return { error: notAMemberOfOrganizationError };
    }

    if (isMember.role !== ADMIN_ROLE) {
      return { error: notAnAdminError };
    }

    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organizationId)
      .executeTakeFirstOrThrow();

    if (!organization.stripe_product || !organization.stripe_billing_cycle) {
      throw new Error("Stripe product or billing cycle is not set");
    }

    // check if user is downgrading to an inferior product
    switch (organization.stripe_product) {
      case CUSTOM_PRODUCT:
        return { error: cannotChangeCustomProductError };
      case PRO_PRODUCT:
        if (![PREMIUM_PRODUCT].includes(product)) {
          return { error: cannotDowngradeToSuperiorProductError };
        }
        break;
      case BASIC_PRODUCT:
        if (![PRO_PRODUCT, PREMIUM_PRODUCT].includes(product)) {
          return { error: cannotDowngradeToSuperiorProductError };
        }
        break;
    }

    // Check if the user is downgrading to an inferior billing cycle
    if (organization.stripe_product === product) {
      switch (organization.stripe_billing_cycle) {
        case MONTHLY_BILLING_CYCLE:
          if (billingCycle === YEARLY_BILLING_CYCLE) {
            return { error: cannotDowngradeToSuperiorProductError };
          }
          break;
        case YEARLY_BILLING_CYCLE:
          // this is allowed
          break;
      }
    }

    // Check if the user is downgrading to the same product and billing cycle
    if (
      organization.stripe_product === product &&
      organization.stripe_billing_cycle === billingCycle
    ) {
      return { error: cannotChangeToSameProductAndBillingCycleError };
    }

    if (!organization.stripe_customer_id) {
      throw new Error("Stripe customer ID is not set");
    }

    const stripeService = new StripeService();
    await stripeService.switchSubscription(
      organization.stripe_customer_id,
      product,
      billingCycle,
      "downgrade",
    );

    const oldSubscription = {
      product: organization.stripe_product,
      billingCycle: organization.stripe_billing_cycle,
    };

    const newSubscription = {
      product,
      billingCycle,
    };

    await db
      .updateTable("organization")
      .set({
        stripe_product: product,
        stripe_billing_cycle: billingCycle,
      })
      .where("id", "=", organizationId)
      .execute();

    // Send email to all admins
    const emails = await db
      .selectFrom("user")
      .select("email")
      .innerJoin(
        "organization_member",
        "organization_member.user_id",
        "user.id",
      )
      .where("organization_member.organization_id", "=", organizationId)
      .where("organization_member.role", "=", ADMIN_ROLE)
      .execute();

    const subscription = await stripeService.getCustomerSubscription(
      organization.stripe_customer_id,
    );

    const newSubscriptionDate = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : "unknown";

    for (const email of emails) {
      sendSubscriptionDowngradedEmail({
        email: email.email,
        organizationName: organization.name,
        oldSubscription,
        newSubscription,
        newSubscriptionDate,
      });
    }

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
      .updateTable("organization")
      .set({
        access_enabled: accessEnabled,
      })
      .where("stripe_customer_id", "=", customer.id)
      .execute();
  }
}
