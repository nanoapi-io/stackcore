import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";
import type Stripe from "stripe";
export interface WorkspaceTable {
  id: Generated<number>;
  name: string;
  isTeam: boolean;
  stripe_customer_id: string | null;
  access_enabled: boolean;
  deactivated: boolean;
  created_at: ColumnType<Date>;
}

export type Workspace = Selectable<WorkspaceTable>;
export type NewWorkspace = Insertable<WorkspaceTable>;
export type WorkspaceUpdate = Updateable<WorkspaceTable>;

/*
  subscriptionStatus: The status of the subscription in Stripe
  Returns true if the workspace should have access, false otherwise
*/
export function shouldHaveAccess(
  subscriptionStatus: Stripe.Subscription.Status,
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
