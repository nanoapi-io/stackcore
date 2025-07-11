function getEnv(key: string, defaultValue: string) {
  const value = Deno.env.get(key);

  if (value) return value;

  if (defaultValue) return defaultValue;

  throw new Error(`Environment variable ${key} is not set`);
}

export default {
  SECRET_KEY: getEnv("SECRET_KEY", "secret"),
  OTP: {
    REQUEST_INTERVAL_SECONDS: 10,
    EXPIRY_MINUTES: 5,
    MAX_ATTEMPTS: 3,
    SKIP_OTP: getEnv("SKIP_OTP", "false") === "true",
  },
  JWT: {
    EXPIRY_DAYS: 7,
  },
  INVITATION: {
    EXPIRY_DAYS: 7,
  },
  MANIFEST: {
    DEFAULT_VERSION: 1,
  },
  STRIPE: {
    SECRET_KEY: getEnv("STRIPE_API_KEY", "sk_test_secret"),
    WEBHOOK_SECRET: getEnv("STRIPE_WEBHOOK_SECRET", "whsec_secret"),
    USE_MOCK: getEnv("STRIPE_USE_MOCK", "false") === "true",
    METER: {
      CREDIT_USAGE_METER_ID: getEnv(
        "STRIPE_METER_CREDIT_USAGE_METER_ID",
        "meter_1234567890",
      ),
      CREDIT_USAGE_EVENT_NAME: "credit_usage",
      CREDIT_USAGE_MANIFEST_CREATE: 1,
    },
    // This is to make sure that BASIC user that exceed their included credits have a card on file
    BILLING_THRESHOLD_BASIC: 6,
    PRODUCTS: {
      BASIC: {
        MONTHLY: {
          PRICE_ID: getEnv(
            "STRIPE_PRODUCT_BASIC_MONTHLY_PRICE_ID",
            "price_basic_monthly",
          ),
        },
      },
      PRO: {
        MONTHLY: {
          PRICE_ID: getEnv(
            "STRIPE_PRODUCT_PRO_MONTHLY_PRICE_ID",
            "price_pro_monthly",
          ),
        },
        YEARLY: {
          PRICE_ID: getEnv(
            "STRIPE_PRODUCT_PRO_YEARLY_PRICE_ID",
            "price_pro_yearly",
          ),
        },
      },
      PREMIUM: {
        MONTHLY: {
          PRICE_ID: getEnv(
            "STRIPE_PRODUCT_PREMIUM_MONTHLY_PRICE_ID",
            "price_premium_monthly",
          ),
        },
        YEARLY: {
          PRICE_ID: getEnv(
            "STRIPE_PRODUCT_PREMIUM_YEARLY_PRICE_ID",
            "price_premium_yearly",
          ),
        },
      },
    },
  },
  PAGINATION: {
    MAX_LIMIT: 100,
  },
  DATABASE: {
    HOST: getEnv("DATABASE_HOST", "localhost"),
    PORT: parseInt(getEnv("DATABASE_PORT", "5432")),
    USER: getEnv("DATABASE_USER", "user"),
    PASSWORD: getEnv("DATABASE_PASSWORD", "password"),
    DATABASE: getEnv("DATABASE_NAME", "core"),
  },
  EMAIL: {
    RESEND_API_KEY: getEnv("RESEND_API_KEY", "resend_api_key"),
    FROM_EMAIL: getEnv("RESEND_FROM_EMAIL", "noreply@nanoapi.io"),
    USE_CONSOLE: getEnv("EMAIL_USE_CONSOLE", "true") === "true",
  },
  SENTRY: {
    DSN: Deno.env.get("SENTRY_DSN"),
  },
  GCP_BUCKET: {
    USE_FAKE_GCS_SERVER: getEnv("GCP_USE_FAKE_GCS_SERVER", "false") === "true",
    PROJECT_ID: getEnv("GCP_PROJECT_ID", "your-project-id"),
    BUCKET_NAME: getEnv("GCP_BUCKET_NAME", "your-bucket-name"),
    SIGNED_URL_EXPIRY_SECONDS: 60 * 60,
  },
  AI: {
    GOOGLE: {
      API_KEY: getEnv("GOOGLE_AI_API_KEY", "google_api_key"),
    },
  },
};
