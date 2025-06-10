import Stripe from "stripe";

const stripeApiKey = prompt("Enter your Stripe API key:");

if (!stripeApiKey) {
  console.error("❌ Stripe API key is required");
  Deno.exit(1);
}

const stripe = new Stripe(stripeApiKey);

const METER_EVENT_NAME = "credit_usage";

console.info("Starting product and price creation script...");

async function createMeter() {
  console.info("Creating new meter...");
  return await stripe.billing.meters.create({
    default_aggregation: {
      formula: "sum",
    },
    display_name: "credits-meter",
    event_name: METER_EVENT_NAME,
    customer_mapping: {
      type: "by_id",
      event_payload_key: "stripe_customer_id",
    },
    value_settings: {
      event_payload_key: "value",
    },
  });
}

async function createProduct(name: string, description: string) {
  console.info(`Creating product: ${name}...`);
  return await stripe.products.create({
    name,
    description,
  });
}

async function createPrice(
  productId: string,
  meterId: string,
  config: {
    nickname: string;
    currency: string;
    subscriptionPrice: number;
    includedCredits: number;
    overagePrice: number;
    interval: "month" | "year";
  },
) {
  console.info(`Creating price: ${config.nickname}...`);
  return await stripe.prices.create({
    product: productId,
    nickname: config.nickname,
    currency: config.currency,
    billing_scheme: "tiered",
    tiers_mode: "graduated",
    tiers: [
      {
        flat_amount: config.subscriptionPrice,
        up_to: config.includedCredits,
        unit_amount: 0,
      },
      {
        up_to: "inf",
        unit_amount: config.overagePrice,
      },
    ],
    recurring: {
      interval: config.interval,
      usage_type: "metered",
      meter: meterId,
    },
  });
}

let meterId = "";
const shouldCreateMeter = prompt("Create meter? (y/n)");
if (shouldCreateMeter === "y") {
  try {
    console.info("Creating new meter...");
    const meter = await createMeter();
    meterId = meter.id;
    console.info("✓ Meter created successfully");
  } catch (error) {
    console.error("❌ Failed to create meter:", error);
    Deno.exit(1);
  }
} else {
  console.info("Looking for existing meter...");
  const meters = await stripe.billing.meters.list({
    status: "active",
    limit: 10,
  });

  const meter = meters.data.find((m) => m.event_name === METER_EVENT_NAME);

  if (!meter) {
    console.error("❌ Meter not found.");
    Deno.exit(1);
  }

  meterId = meter.id;
  console.info("✓ Found existing meter");
}

console.info("\nCreating products...");
// Create products
const basicProduct = await createProduct("Basic", "Basic subscription");
const proProduct = await createProduct("Pro", "Pro subscription");
const premiumProduct = await createProduct("Premium", "Premium subscription");
console.info("✓ All products created successfully\n");

console.info("Creating prices...");
// Basic monthly USD
const basicMonthlyPrice = await createPrice(basicProduct.id, meterId, {
  nickname: "Basic Monthly USD",
  currency: "usd",
  subscriptionPrice: 0, // free
  includedCredits: 5, // 5 credits free per month
  overagePrice: 200, // 2.00 USD per credit after that
  interval: "month",
});

// Pro monthly USD
const proMonthlyPrice = await createPrice(proProduct.id, meterId, {
  nickname: "Pro Monthly",
  currency: "usd",
  subscriptionPrice: 3000, // 30 USD per month
  includedCredits: 50, // 50 credits free per month
  overagePrice: 100, // 1.00 USD per credit after that
  interval: "month",
});

// Pro yearly USD
const proYearlyPrice = await createPrice(proProduct.id, meterId, {
  nickname: "Pro Yearly",
  currency: "usd",
  subscriptionPrice: 3000 * 10, // 30 USD per month (2 months free)
  includedCredits: 50 * 12, // 50 credits free per month
  overagePrice: 100, // 1.00 USD per credit after that
  interval: "year",
});

// Premium monthly USD
const premiumMonthlyPrice = await createPrice(premiumProduct.id, meterId, {
  nickname: "Premium Monthly",
  currency: "usd",
  subscriptionPrice: 10000, // 100 USD per month
  includedCredits: 250, // 250 credits free per month
  overagePrice: 50, // 0.50 USD per credit after that
  interval: "month",
});

// Premium yearly USD
const premiumYearlyPrice = await createPrice(premiumProduct.id, meterId, {
  nickname: "Premium Yearly",
  currency: "usd",
  subscriptionPrice: 10000 * 10, // 100 USD per month (2 months free)
  includedCredits: 250 * 12, // 250 credits free per month
  overagePrice: 50, // 0.50 USD per credit after that
  interval: "year",
});

console.info("✓ All stripe objects created successfully\n");

console.info(`
=== Summary ===
Meter ID:                 ${meterId}
Basic product ID:         ${basicProduct.id}
Basic monthly price ID:   ${basicMonthlyPrice.id}
Pro product ID:           ${proProduct.id}
Pro monthly price ID:     ${proMonthlyPrice.id}
Pro yearly price ID:      ${proYearlyPrice.id}
Premium product ID:       ${premiumProduct.id}
Premium monthly price ID: ${premiumMonthlyPrice.id}
Premium yearly price ID:  ${premiumYearlyPrice.id}
`);

console.info(`
=== Environment variables ===
STRIPE_METER_CREDIT_USAGE_METER_ID=${meterId}
STRIPE_PRODUCT_BASIC_MONTHLY_PRICE_ID=${basicMonthlyPrice.id}
STRIPE_PRODUCT_PRO_MONTHLY_PRICE_ID=${proMonthlyPrice.id}
STRIPE_PRODUCT_PRO_YEARLY_PRICE_ID=${proYearlyPrice.id}
STRIPE_PRODUCT_PREMIUM_MONTHLY_PRICE_ID=${premiumMonthlyPrice.id}
STRIPE_PRODUCT_PREMIUM_YEARLY_PRICE_ID=${premiumYearlyPrice.id}
`);

Deno.exit(0);
