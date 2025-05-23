import {
  BASIC_PRODUCT,
  MONTHLY_BILLING_CYCLE,
  PREMIUM_PRODUCT,
  PRO_PRODUCT,
  StripeProduct,
  YEARLY_BILLING_CYCLE,
} from "./db/models/organization.ts";

function getEnv(key: string, defaultValue: string) {
  const value = Deno.env.get(key);

  if (value) return value;

  if (defaultValue) return defaultValue;

  throw new Error(`Environment variable ${key} is not set`);
}

export default {
  SECRET_KEY: getEnv("SECRET_KEY", "secret"),
  OTP: {
    EXPIRY_MINUTES: parseInt(getEnv("OTP_EXPIRY_MINUTES", "5")),
  },
  JWT: {
    EXPIRY_DAYS: parseInt(getEnv("JWT_EXPIRY_DAYS", "7")),
  },
  ORGANIZATION: {
    DEFAULT_MONTHLY_CREDITS: parseInt(
      getEnv("ORGANIZATION_DEFAULT_MONTHLY_CREDITS", "1000"),
    ),
  },
  INVITATION: {
    EXPIRY_DAYS: parseInt(getEnv("INVITATION_EXPIRY_DAYS", "7")),
  },
  STRIPE: {
    SECRET_KEY: getEnv("STRIPE_API_KEY", "sk_test_secret"),
    WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET", "whsec_secret"),
    USE_MOCK: getEnv("STRIPE_USE_MOCK", "false") === "true",
    METER: {
      CREDIT_USAGE_EVENT_NAME: getEnv(
        "STRIPE_METER_CREDIT_USAGE_EVENT_NAME",
        "credits-usage",
      ),
    },
    PRODUCTS: {
      [BASIC_PRODUCT as StripeProduct]: {
        LICENSE_PRICE_ID: {
          [MONTHLY_BILLING_CYCLE]: getEnv(
            "STRIPE_PRODUCT_BASIC_LICENSE_MONTHLY_PRICE_ID",
            "price_basic_license_monthly",
          ),
          [YEARLY_BILLING_CYCLE]: getEnv(
            "STRIPE_PRODUCT_BASIC_LICENSE_YEARLY_PRICE_ID",
            "price_basic_license_yearly",
          ),
        },
        MONTHLY_METER_PRICE_ID: getEnv(
          "STRIPE_PRODUCT_BASIC_MONTHLY_METER_CREDIT_USAGE_PRICE_ID",
          "price_basic_monthly_meter_credit_usage",
        ),
      },
      [PRO_PRODUCT as StripeProduct]: {
        LICENSE_PRICE_ID: {
          [MONTHLY_BILLING_CYCLE]: getEnv(
            "STRIPE_PRODUCT_PRO_LICENSE_MONTHLY_PRICE_ID",
            "price_pro_license_monthly",
          ),
          [YEARLY_BILLING_CYCLE]: getEnv(
            "STRIPE_PRODUCT_PRO_LICENSE_YEARLY_PRICE_ID",
            "price_pro_license_yearly",
          ),
        },
        MONTHLY_METER_PRICE_ID: getEnv(
          "STRIPE_PRODUCT_PRO_MONTHLY_METER_CREDIT_USAGE_PRICE_ID",
          "price_pro_monthly_meter_credit_usage",
        ),
      },
      [PREMIUM_PRODUCT as StripeProduct]: {
        LICENSE_PRICE_ID: {
          [MONTHLY_BILLING_CYCLE]: getEnv(
            "STRIPE_PRODUCT_PREMIUM_LICENSE_MONTHLY_PRICE_ID",
            "price_premium_license_monthly",
          ),
          [YEARLY_BILLING_CYCLE]: getEnv(
            "STRIPE_PRODUCT_PREMIUM_LICENSE_YEARLY_PRICE_ID",
            "price_premium_license_yearly",
          ),
        },
        MONTHLY_METER_PRICE_ID: getEnv(
          "STRIPE_PRODUCT_PREMIUM_MONTHLY_METER_CREDIT_USAGE_PRICE_ID",
          "price_premium_monthly_meter_credit_usage",
        ),
      },
    },
  },
  FRONTEND: {
    URL: getEnv("FRONTEND_URL", "http://localhost:3000"),
  },
  DATABASE: {
    HOST: getEnv("DATABASE_HOST", "localhost"),
    PORT: parseInt(getEnv("DATABASE_PORT", "5432")),
    USER: getEnv("DATABASE_USER", "user"),
    PASSWORD: getEnv("DATABASE_PASSWORD", "password"),
    DATABASE: getEnv("DATABASE_NAME", "core"),
  },
};
