import { getStripe } from "../index.ts";

const stripe = getStripe();

// Get product ID from user input
const basicProductId = prompt("Enter the basic product ID:");
if (!basicProductId) {
  console.error("Basic product ID is required");
  Deno.exit(1);
}

const proProductId = prompt("Enter the pro product ID:");
if (!proProductId) {
  console.error("Pro product ID is required");
  Deno.exit(1);
}

const premiumProductId = prompt("Enter the premium product ID:");
if (!premiumProductId) {
  console.error("Premium product ID is required");
  Deno.exit(1);
}

const meterId = prompt("Enter the meter ID:");
if (!meterId) {
  console.error("Meter ID is required");
  Deno.exit(1);
}

async function createPricesForProduct(
  data: {
    productId: string;
    meterId: string;
    productName: string;
    priceMonthly: number;
    priceYearly: number;
    priceMetered: number;
  },
) {
  console.info(`Creating prices for ${data.productName}...`);
  await stripe.prices.create({
    product: data.productId,
    nickname: data.productName,
    unit_amount: data.priceMonthly,
    currency: "usd",
    recurring: {
      interval: "month",
      interval_count: 1,
      usage_type: "licensed",
    },
  });
  console.info(`Created monthly price for ${data.productName}`);
  await stripe.prices.create({
    product: data.productId,
    nickname: data.productName,
    unit_amount: data.priceYearly,
    currency: "usd",
    recurring: {
      interval: "year",
      interval_count: 1,
      usage_type: "licensed",
    },
  });
  console.info(`Created yearly price for ${data.productName}`);
  await stripe.prices.create({
    product: data.productId,
    nickname: data.productName,
    unit_amount: data.priceMetered,
    currency: "usd",
    recurring: {
      interval: "month",
      interval_count: 1,
      usage_type: "metered",
      meter: data.meterId,
    },
  });
  console.info(`Created metered price for ${data.productName}`);
  console.info(`----------------------------------------------`);
}

await createPricesForProduct({
  productId: basicProductId,
  meterId,
  productName: "basic",
  priceMonthly: 0, // 0 USD
  priceYearly: 0, // 0 USD
  priceMetered: 50, // 0.50 USD
});

await createPricesForProduct({
  productId: proProductId,
  meterId,
  productName: "pro",
  priceMonthly: 1000, // 10 USD
  priceYearly: 10000, // 100 USD
  priceMetered: 20, // 0.20 USD
});

await createPricesForProduct({
  productId: premiumProductId,
  meterId,
  productName: "premium",
  priceMonthly: 5000, // 50 USD
  priceYearly: 50000, // 500 USD
  priceMetered: 10, // 0.10 USD
});
