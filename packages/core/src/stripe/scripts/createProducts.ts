import { getStripe } from "../index.ts";

const stripe = getStripe();

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
    event_time_window: "day",
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
// Basic product prices

// Basic monthly
const basicMonthlyPrice = await createPrice(basicProduct.id, meterId, {
  nickname: "Basic Monthly",
  currency: "usd",
  subscriptionPrice: 0, // free
  includedCredits: 50, // 50 credits free per month
  overagePrice: 50, // 0.50 USD per credit after that
  interval: "month",
});

// Basic yearly
const basicYearlyPrice = await createPrice(basicProduct.id, meterId, {
  nickname: "Basic Yearly",
  currency: "usd",
  subscriptionPrice: 0, // free
  includedCredits: 50 * 12, // 50 credits free per month
  overagePrice: 50, // 0.50 USD per credit after that
  interval: "year",
});

// Pro monthly
const proMonthlyPrice = await createPrice(proProduct.id, meterId, {
  nickname: "Pro Monthly",
  currency: "usd",
  subscriptionPrice: 1000, // 10 USD per month
  includedCredits: 500, // 500 credits free per month
  overagePrice: 25, // 0.25 USD per credit after that
  interval: "month",
});

// Pro yearly
const proYearlyPrice = await createPrice(proProduct.id, meterId, {
  nickname: "Pro Yearly",
  currency: "usd",
  subscriptionPrice: 1000 * 10, // 10 USD per month (2 months free)
  includedCredits: 500 * 12, // 500 credits free per month
  overagePrice: 25, // 0.25 USD per credit after that
  interval: "year",
});

// Premium monthly
const premiumMonthlyPrice = await createPrice(premiumProduct.id, meterId, {
  nickname: "Premium Monthly",
  currency: "usd",
  subscriptionPrice: 5000, // 50 USD per month
  includedCredits: 5000, // 5000 credits free per month
  overagePrice: 10, // 0.10 USD per credit after that
  interval: "month",
});

// Premium yearly
const premiumYearlyPrice = await createPrice(premiumProduct.id, meterId, {
  nickname: "Premium Yearly",
  currency: "usd",
  subscriptionPrice: 5000 * 10, // 50 USD per month (2 months free)
  includedCredits: 5000 * 12, // 5000 credits free per month
  overagePrice: 10, // 0.10 USD per credit after that
  interval: "year",
});

console.info("✓ All prices created successfully\n");

console.info("=== Summary ===");
console.info(`Meter ID: ${meterId}`);
console.info("\nProduct and Price IDs:");
console.info(
  `Basic product ID:   ${basicProduct.id},   Monthly Price ID: ${basicMonthlyPrice.id},   Yearly Price ID: ${basicYearlyPrice.id}`,
);
console.info(
  `Pro product ID:     ${proProduct.id},     Monthly Price ID: ${proMonthlyPrice.id},     Yearly Price ID: ${proYearlyPrice.id}`,
);
console.info(
  `Premium product ID: ${premiumProduct.id}, Monthly Price ID: ${premiumMonthlyPrice.id}, Yearly Price ID: ${premiumYearlyPrice.id}`,
);
console.info("\n✓ Script completed successfully");
Deno.exit(0);
