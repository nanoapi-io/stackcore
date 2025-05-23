import { getStripe } from "../index.ts";

const stripe = getStripe();

const meterId = prompt("Enter the meter ID: ");
if (!meterId) {
  console.error("Meter ID is required.");
  Deno.exit(1);
}

// Create products
const basicProduct = await stripe.products.create({
  name: "Basic",
  description: "Basic plan",
});
const proProduct = await stripe.products.create({
  name: "Pro",
  description: "Pro plan",
});
const premiumProduct = await stripe.products.create({
  name: "Premium",
  description: "Premium plan",
});

// Basic product prices

// Basic monthly (free)
await stripe.prices.create({
  product: basicProduct.id,
  unit_amount: 0,
  currency: "usd",
  recurring: {
    interval: "month",
  },
});

// Basic yearly
await stripe.prices.create({
  product: basicProduct.id,
  unit_amount: 0,
  currency: "usd",
  recurring: {
    interval: "year",
  },
});

// Basic usage
// 50 credits for free
// then 0.50 USD per credit
await stripe.prices.create({
  product: basicProduct.id,
  currency: "usd",
  billing_scheme: "tiered",
  tiers_mode: "graduated",
  tiers: [
    {
      up_to: 50,
      unit_amount: 0,
    },
    {
      up_to: "inf",
      unit_amount: 50, // 0.50 USD per credit
    },
  ],
  recurring: {
    interval: "month",
    usage_type: "metered",
    meter: meterId,
  },
});

// Pro product prices

// Pro monthly
await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 1000,
  currency: "usd",
  recurring: {
    interval: "month",
  },
});

// Pro yearly
await stripe.prices.create({
  product: proProduct.id,
  unit_amount: 10000,
  currency: "usd",
  recurring: {
    interval: "year",
  },
});

// Pro usage
// 100 credits for free
// then 0.25 USD per credit
await stripe.prices.create({
  product: proProduct.id,
  currency: "usd",
  billing_scheme: "tiered",
  tiers_mode: "graduated",
  tiers: [
    {
      up_to: 100,
      unit_amount: 0,
    },
    {
      up_to: "inf",
      unit_amount: 25, // 0.25 USD per credit
    },
  ],
  recurring: {
    interval: "month",
    usage_type: "metered",
    meter: meterId,
  },
});

// Premium product prices

// Premium monthly
await stripe.prices.create({
  product: premiumProduct.id,
  unit_amount: 2000,
  currency: "usd",
  recurring: {
    interval: "month",
  },
});

// Premium yearly
await stripe.prices.create({
  product: premiumProduct.id,
  unit_amount: 20000,
  currency: "usd",
  recurring: {
    interval: "year",
  },
});

// Premium usage
// 1000 credits for free
// then 0.10 USD per credit
await stripe.prices.create({
  product: premiumProduct.id,
  currency: "usd",
  billing_scheme: "tiered",
  tiers_mode: "graduated",
  tiers: [
    {
      up_to: 1000,
      unit_amount: 0,
    },
    {
      up_to: "inf",
      unit_amount: 10, // 0.10 USD per credit
    },
  ],
  recurring: {
    interval: "month",
    usage_type: "metered",
    meter: meterId,
  },
});

console.info("Products and prices created successfully.");
console.info(`Basic product ID:   ${basicProduct.id}`);
console.info(`Pro product ID:     ${proProduct.id}`);
console.info(`Premium product ID: ${premiumProduct.id}`);
Deno.exit(0);
