import { getStripe } from "../index.ts";

const stripe = getStripe();

try {
  const meter = await stripe.billing.meters.create({
    default_aggregation: {
      formula: "sum",
    },
    display_name: "credits-meter",
    event_name: "credit_usage",
    customer_mapping: {
      type: "by_id",
      event_payload_key: "stripe_customer_id",
    },
    event_time_window: "day",
    value_settings: {
      event_payload_key: "value",
    },
  });

  console.info("Meter created successfully.");
  console.info(`Meter ID: ${meter.id}`);
  Deno.exit(0);
} catch (error) {
  if (
    error instanceof stripe.errors.StripeInvalidRequestError
  ) {
    if (
      error.message ===
        "An active meter already exists for event name 'credit_usage'. To create a new meter with the same event name, first deactivate the currently active meter."
    ) {
      console.error("Meter already exists.");
      Deno.exit(1);
    } else {
      console.error(error.message);
    }
    Deno.exit(1);
  }
  console.error(error);
  Deno.exit(1);
}
