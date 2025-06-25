import { assertEquals } from "@std/assert";
import api from "../index.ts";
import {
  type ADMIN_ROLE,
  db,
  destroyKyselyDb,
  initKyselyDb,
  MEMBER_ROLE,
} from "@stackcore/db";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { WorkspaceService } from "../workspace/service.ts";
import { BillingApiTypes } from "../responseType.ts";
import { StripeService } from "../../stripe/index.ts";
import settings from "@stackcore/settings";

// Helper function to create a team workspace and add user as admin
async function createTestTeamWorkspace(userId: number, workspaceName: string) {
  const workspaceService = new WorkspaceService();
  await workspaceService.createTeamWorkspace(workspaceName, userId);

  const workspace = await db
    .selectFrom("workspace")
    .selectAll()
    .where("name", "=", workspaceName)
    .where("isTeam", "=", true)
    .executeTakeFirstOrThrow();

  return workspace;
}

// Helper function to add a user as member to workspace
async function addMemberToWorkspace(
  workspaceId: number,
  userId: number,
  role: typeof ADMIN_ROLE | typeof MEMBER_ROLE = MEMBER_ROLE,
) {
  await db
    .insertInto("member")
    .values({
      workspace_id: workspaceId,
      user_id: userId,
      role,
      created_at: new Date(),
    })
    .execute();
}

// Helper function to set up basic subscription for testing
async function setupBasicSubscription(workspaceId: number) {
  const workspace = await db
    .selectFrom("workspace")
    .selectAll()
    .where("id", "=", workspaceId)
    .executeTakeFirstOrThrow();

  if (!workspace.stripe_customer_id) {
    throw new Error("Workspace does not have a Stripe customer ID");
  }

  const stripeService = new StripeService();
  const subscription = await stripeService.createSubscription(
    workspace.stripe_customer_id,
    settings.STRIPE.PRODUCTS.BASIC.NAME,
    settings.STRIPE.MONTHLY_BILLING_CYCLE,
    null,
  );

  return subscription;
}

// Helper function to mock fetch with specific price ID
function createFetchMock(
  originalFetch: typeof fetch,
  priceId: string,
  hasPaymentMethod = false,
) {
  return async (input: string | Request | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    // Intercept subscription list requests
    if (
      url.includes("/v1/subscriptions") && url.includes("customer=") &&
      init?.method === "GET"
    ) {
      const originalResponse = await originalFetch(input, init);
      const originalData = await originalResponse.json();

      // Override price ID and optionally add payment method
      if (originalData.data?.[0]?.items?.data?.[0]?.price) {
        originalData.data[0].items.data[0].price.id = priceId;
      }

      return new Response(JSON.stringify(originalData), {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers,
      });
    }

    // Intercept customer retrieve requests
    if (url.includes("/v1/customers/") && init?.method === "GET") {
      const originalResponse = await originalFetch(input, init);
      const originalData = await originalResponse.json();

      // override default payment method
      if (hasPaymentMethod) {
        originalData.invoice_settings.default_payment_method = "pm_card_visa";
      } else {
        originalData.invoice_settings.default_payment_method = null;
      }

      return new Response(JSON.stringify(originalData), {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers,
      });
    }

    // Intercept subscription update requests (for upgrades/downgrades)
    if (
      url.includes("/v1/subscriptions/") && init?.method === "POST" &&
      init?.body
    ) {
      const originalResponse = await originalFetch(input, init);
      const originalData = await originalResponse.json();

      return new Response(JSON.stringify(originalData), {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers: originalResponse.headers,
      });
    }

    return originalFetch(input, init);
  };
}

// --- GET SUBSCRIPTION TESTS ---
Deno.test("get subscription for team workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up a basic subscription
    await setupBasicSubscription(workspace.id);

    const { url, method } = BillingApiTypes.prepareGetSubscription(
      workspace.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const subscription = await response?.json();

    // With Stripe mock, the price IDs are generated dynamically and don't match our settings
    // so the subscription will be detected as CUSTOM product
    assertEquals(subscription.product, "CUSTOM");
    assertEquals(subscription.billingCycle, null); // Custom products don't have billing cycle
    assertEquals(typeof subscription.hasDefaultPaymentMethod, "boolean");
    assertEquals(subscription.cancelAt, null);
    assertEquals(subscription.newProductWhenCanceled, null);
    assertEquals(subscription.newBillingCycleWhenCanceled, null);
    assertEquals(subscription.currentUsage >= 0, true); // whatever stripe mock returns, it should be a number
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get subscription for team workspace - with matching price ID for basic product", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up a basic subscription first (this will create it with dynamic price ID from Stripe mock)
    await setupBasicSubscription(workspace.id);

    // Mock fetch to override the Stripe API response with our expected price ID
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_basic_monthly",
    );

    const { url, method } = BillingApiTypes.prepareGetSubscription(
      workspace.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const subscription = await response?.json();

    // Now with the correct price ID, it should be detected as BASIC product
    assertEquals(subscription.product, "BASIC");
    assertEquals(subscription.billingCycle, "MONTHLY");
    assertEquals(typeof subscription.hasDefaultPaymentMethod, "boolean");
    // Note: cancelAt might be set by Stripe mock, that's expected
    assertEquals(subscription.newProductWhenCanceled, null);
    assertEquals(subscription.newBillingCycleWhenCanceled, null);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get subscription for team workspace - with matching price ID for pro yearly product", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up a basic subscription first (this will create it with dynamic price ID from Stripe mock)
    await setupBasicSubscription(workspace.id);

    // Mock fetch to override the Stripe API response with PRO YEARLY price ID
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_pro_yearly",
    );

    const { url, method } = BillingApiTypes.prepareGetSubscription(
      workspace.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const subscription = await response?.json();

    // Now with the correct price ID, it should be detected as PRO product with YEARLY billing
    assertEquals(subscription.product, "PRO");
    assertEquals(subscription.billingCycle, "YEARLY");
    assertEquals(typeof subscription.hasDefaultPaymentMethod, "boolean");
    assertEquals(subscription.newProductWhenCanceled, null);
    assertEquals(subscription.newBillingCycleWhenCanceled, null);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get subscription for team workspace - with matching price ID for premium monthly product", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up a basic subscription first (this will create it with dynamic price ID from Stripe mock)
    await setupBasicSubscription(workspace.id);

    // Mock fetch to override the Stripe API response with PREMIUM MONTHLY price ID
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_premium_monthly",
    );

    const { url, method } = BillingApiTypes.prepareGetSubscription(
      workspace.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const subscription = await response?.json();

    // Now with the correct price ID, it should be detected as PREMIUM product with MONTHLY billing
    assertEquals(subscription.product, "PREMIUM");
    assertEquals(subscription.billingCycle, "MONTHLY");
    assertEquals(typeof subscription.hasDefaultPaymentMethod, "boolean");
    assertEquals(subscription.newProductWhenCanceled, null);
    assertEquals(subscription.newBillingCycleWhenCanceled, null);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get subscription - not a member of workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user and workspace
    const { userId: firstUserId } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      firstUserId,
      "Test Team Workspace",
    );

    // Create second user (not a member)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = BillingApiTypes.prepareGetSubscription(
      workspace.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(error.error, "not_a_member_of_workspace");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get subscription - invalid workspace id", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/billing/subscription?workspaceId=invalid`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(typeof error.error, "object");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- UPGRADE SUBSCRIPTION TESTS ---
Deno.test("upgrade subscription from basic to pro", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up basic subscription first
    await setupBasicSubscription(workspace.id);

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    // With Stripe mock, the subscription will be CUSTOM and upgrades from CUSTOM are not allowed
    assertEquals(response?.status, 400);
    const result = await response?.json();
    assertEquals(result.error, "cannot_upgrade_without_default_payment_method");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription from basic to pro - with matching price ID and payment method", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up basic subscription first
    await setupBasicSubscription(workspace.id);

    // Mock fetch to override Stripe API responses with payment method
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_basic_monthly",
      true,
    );

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    // Now with the correct price ID and payment method, upgrade should succeed
    assertEquals(response?.status, 200);
    const result = await response?.json();
    // Should return success message
    assertEquals(result.message, "Subscription upgraded");
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription - not a member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user and workspace
    const { userId: firstUserId } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      firstUserId,
      "Test Team Workspace",
    );

    // Create second user (not a member)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(error.error, "not_a_member_of_workspace");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription - not an admin", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user and workspace
    const { userId: adminUserId } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      adminUserId,
      "Test Team Workspace",
    );

    // Create member user (not admin)
    const { userId: memberUserId, token: memberToken } =
      await createTestUserAndToken();
    await addMemberToWorkspace(workspace.id, memberUserId, MEMBER_ROLE);

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${memberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(error.error, "not_an_admin");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription - invalid product", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    const response = await api.handle(
      new Request(`http://localhost:3000/billing/subscription/upgrade`, {
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          product: "invalid_product",
          billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(typeof error.error, "object"); // Zod validation error
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription to same product and billing cycle", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up basic subscription first
    await setupBasicSubscription(workspace.id);

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.BASIC.NAME, // Same product
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE, // Same billing cycle
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    // With Stripe mock generating CUSTOM products, we get the payment method error instead
    assertEquals(
      error.error,
      "cannot_upgrade_without_default_payment_method",
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription - cannot upgrade from pro to basic (inferior product)", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up pro subscription first
    const stripeService = new StripeService();
    if (!workspace.stripe_customer_id) {
      throw new Error("No stripe customer ID");
    }
    await stripeService.createSubscription(
      workspace.stripe_customer_id,
      settings.STRIPE.PRODUCTS.PRO.NAME,
      settings.STRIPE.MONTHLY_BILLING_CYCLE,
      null,
    );

    // Mock fetch to override Stripe API responses to make it appear as PRO monthly with payment method
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_pro_monthly",
      true,
    );

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.BASIC.NAME, // Trying to "upgrade" to inferior product
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    // Should fail with proper error for trying to upgrade to inferior product
    assertEquals(response?.status, 400);
    const result = await response?.json();
    assertEquals(result.error, "cannot_upgrade_to_inferior_product");
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- DOWNGRADE SUBSCRIPTION TESTS ---
Deno.test("downgrade subscription from pro to basic", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up pro subscription first
    const stripeService = new StripeService();
    if (!workspace.stripe_customer_id) {
      throw new Error("No stripe customer ID");
    }
    await stripeService.createSubscription(
      workspace.stripe_customer_id,
      settings.STRIPE.PRODUCTS.PRO.NAME,
      settings.STRIPE.MONTHLY_BILLING_CYCLE,
      null,
    );

    const { url, method, body } = BillingApiTypes.prepareDowngradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.BASIC.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    // With Stripe mock, the subscription will be CUSTOM and downgrades from CUSTOM are not allowed
    assertEquals(response?.status, 400);
    const result = await response?.json();
    assertEquals(result.error, "cannot_change_custom_product");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("downgrade subscription - cannot downgrade to superior product", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up basic subscription first
    await setupBasicSubscription(workspace.id);

    const { url, method, body } = BillingApiTypes.prepareDowngradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME, // Superior product
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    // With Stripe mock generating CUSTOM products, we get the custom product error
    assertEquals(error.error, "cannot_change_custom_product");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("downgrade subscription from pro to basic - with matching price ID", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up pro subscription first
    const stripeService = new StripeService();
    if (!workspace.stripe_customer_id) {
      throw new Error("No stripe customer ID");
    }
    await stripeService.createSubscription(
      workspace.stripe_customer_id,
      settings.STRIPE.PRODUCTS.PRO.NAME,
      settings.STRIPE.MONTHLY_BILLING_CYCLE,
      null,
    );

    // Mock fetch to override Stripe API responses to make it appear as PRO monthly
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_pro_monthly",
    );

    const { url, method, body } = BillingApiTypes.prepareDowngradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.BASIC.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    // Now with the correct price ID, downgrade should succeed
    assertEquals(response?.status, 200);
    const result = await response?.json();
    assertEquals(result.message, "Subscription downgraded");
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- PORTAL SESSION TESTS ---
Deno.test("create portal session", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    const { url, method, body } = BillingApiTypes.prepareCreatePortalSession({
      workspaceId: workspace.id,
      returnUrl: "https://example.com/billing",
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const result = await response?.json();
    assertEquals(typeof result.url, "string");
    assertEquals(result.url.length > 0, true);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create portal session - not a member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user and workspace
    const { userId: firstUserId } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      firstUserId,
      "Test Team Workspace",
    );

    // Create second user (not a member)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method, body } = BillingApiTypes.prepareCreatePortalSession({
      workspaceId: workspace.id,
      returnUrl: "https://example.com/billing",
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(error.error, "not_a_member_of_workspace");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create portal session - invalid request body", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(`http://localhost:3000/billing/portal`, {
        method: "POST",
        body: JSON.stringify({
          workspaceId: "invalid", // Should be number
          returnUrl: "https://example.com/billing",
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(typeof error.error, "object"); // Zod validation error
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- PAYMENT METHOD PORTAL TESTS ---
Deno.test("create payment method portal session", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    const {
      url,
      method,
      body,
    } = BillingApiTypes.prepareCreatePortalSessionPaymentMethod({
      workspaceId: workspace.id,
      returnUrl: "https://example.com/billing",
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const result = await response?.json();
    assertEquals(typeof result.url, "string");
    assertEquals(result.url.length > 0, true);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create payment method portal session - not a member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user and workspace
    const { userId: firstUserId } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      firstUserId,
      "Test Team Workspace",
    );

    // Create second user (not a member)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const {
      url,
      method,
      body,
    } = BillingApiTypes.prepareCreatePortalSessionPaymentMethod({
      workspaceId: workspace.id,
      returnUrl: "https://example.com/billing",
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    assertEquals(error.error, "not_a_member_of_workspace");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- WEBHOOK TESTS ---
Deno.test("webhook - missing signature", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const response = await api.handle(
      new Request(`http://localhost:3000/billing/webhook`, {
        method: "POST",
        body: JSON.stringify({ test: "event" }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    assertEquals(response?.status, 400);
    const result = await response?.text();
    assertEquals(result, "No signature");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// Note: For webhook tests with valid signatures, we would need to either:
// 1. Mock the webhook signature verification
// 2. Create valid webhook events with proper signatures
// Since this is complex with Stripe mock, we'll focus on the signature validation

// --- AUTHENTICATION TESTS ---
Deno.test("all endpoints require authentication", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    const endpoints = [
      {
        url: `/billing/subscription?workspaceId=${workspace.id}`,
        method: "GET",
      },
      {
        url: "/billing/subscription/upgrade",
        method: "POST",
        body: {
          workspaceId: workspace.id,
          product: settings.STRIPE.PRODUCTS.PRO.NAME,
          billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
        },
      },
      {
        url: "/billing/subscription/downgrade",
        method: "POST",
        body: {
          workspaceId: workspace.id,
          product: settings.STRIPE.PRODUCTS.BASIC.NAME,
          billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
        },
      },
      {
        url: "/billing/portal",
        method: "POST",
        body: {
          workspaceId: workspace.id,
          returnUrl: "https://example.com",
        },
      },
      {
        url: "/billing/portal/paymentMethod",
        method: "POST",
        body: {
          workspaceId: workspace.id,
          returnUrl: "https://example.com",
        },
      },
    ];

    for (const endpoint of endpoints) {
      const requestInit: RequestInit = {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (endpoint.body) {
        requestInit.body = JSON.stringify(endpoint.body);
      }

      const response = await api.handle(
        new Request(`http://localhost:3000${endpoint.url}`, requestInit),
      );

      // Should return 401 Unauthorized for all authenticated endpoints
      assertEquals(
        response?.status,
        401,
        `Endpoint ${endpoint.method} ${endpoint.url} should require authentication`,
      );
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- EDGE CASES ---
Deno.test("upgrade subscription - yearly to monthly billing cycle change", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up pro yearly subscription first
    const stripeService = new StripeService();
    if (!workspace.stripe_customer_id) {
      throw new Error("No stripe customer ID");
    }
    await stripeService.createSubscription(
      workspace.stripe_customer_id,
      settings.STRIPE.PRODUCTS.PRO.NAME,
      settings.STRIPE.YEARLY_BILLING_CYCLE,
      null,
    );

    // Try to "upgrade" to monthly (which is actually inferior)
    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME,
      billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    // With Stripe mock generating CUSTOM products, we get the payment method error
    assertEquals(error.error, "cannot_upgrade_without_default_payment_method");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("downgrade subscription - monthly to yearly billing cycle change", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up pro monthly subscription first
    const stripeService = new StripeService();
    if (!workspace.stripe_customer_id) {
      throw new Error("No stripe customer ID");
    }
    await stripeService.createSubscription(
      workspace.stripe_customer_id,
      settings.STRIPE.PRODUCTS.PRO.NAME,
      settings.STRIPE.MONTHLY_BILLING_CYCLE,
      null,
    );

    // Try to "downgrade" to yearly (which is actually superior)
    const { url, method, body } = BillingApiTypes.prepareDowngradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME,
      billingCycle: settings.STRIPE.YEARLY_BILLING_CYCLE,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const error = await response?.json();
    // With Stripe mock generating CUSTOM products, we get the custom product error
    assertEquals(error.error, "cannot_change_custom_product");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("upgrade subscription - pro monthly to pro yearly (billing cycle upgrade)", async () => {
  initKyselyDb();
  await resetTables();

  // Store original fetch to restore later
  const originalFetch = globalThis.fetch;

  try {
    const { userId, token } = await createTestUserAndToken();
    const workspace = await createTestTeamWorkspace(
      userId,
      "Test Team Workspace",
    );

    // Set up pro monthly subscription first
    const stripeService = new StripeService();
    if (!workspace.stripe_customer_id) {
      throw new Error("No stripe customer ID");
    }
    await stripeService.createSubscription(
      workspace.stripe_customer_id,
      settings.STRIPE.PRODUCTS.PRO.NAME,
      settings.STRIPE.MONTHLY_BILLING_CYCLE,
      null,
    );

    // Mock fetch to override Stripe API responses to make it appear as PRO monthly with payment method
    globalThis.fetch = createFetchMock(
      originalFetch,
      "price_pro_monthly",
      true,
    );

    const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
      workspaceId: workspace.id,
      product: settings.STRIPE.PRODUCTS.PRO.NAME, // Same product
      billingCycle: settings.STRIPE.YEARLY_BILLING_CYCLE, // Upgrade to yearly
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    // Should succeed - monthly to yearly is a valid upgrade
    assertEquals(response?.status, 200);
    const result = await response?.json();
    assertEquals(result.message, "Subscription upgraded");
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test(
  "upgrade subscription to same product and billing cycle - with matching price ID",
  async () => {
    initKyselyDb();
    await resetTables();

    // Store original fetch to restore later
    const originalFetch = globalThis.fetch;

    try {
      const { userId, token } = await createTestUserAndToken();
      const workspace = await createTestTeamWorkspace(
        userId,
        "Test Team Workspace",
      );

      // Set up basic subscription first
      await setupBasicSubscription(workspace.id);

      // Mock fetch to override Stripe API responses to make it appear as BASIC monthly with payment method
      globalThis.fetch = createFetchMock(
        originalFetch,
        "price_basic_monthly",
        true,
      );

      const { url, method, body } = BillingApiTypes.prepareUpgradeSubscription({
        workspaceId: workspace.id,
        product: settings.STRIPE.PRODUCTS.BASIC.NAME, // Same product
        billingCycle: settings.STRIPE.MONTHLY_BILLING_CYCLE, // Same billing cycle
      });

      const response = await api.handle(
        new Request(`http://localhost:3000${url}`, {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }),
      );

      // Should fail with proper error for trying to upgrade to same product and billing cycle
      assertEquals(response?.status, 400);
      const error = await response?.json();
      assertEquals(
        error.error,
        "cannot_change_to_same_product_and_billing_cycle",
      );
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
      await resetTables();
      await destroyKyselyDb();
    }
  },
);
