function getEnv(key: string, defaultValue: string): string {
  const value = Deno.env.get(key);

  if (value) return value;

  if (defaultValue) return defaultValue;

  throw new Error(`Environment variable ${key} is not set`);
}

const settings: {
  SECRET_KEY: string;
  OTP: {
    REQUEST_INTERVAL_SECONDS: number;
    EXPIRY_MINUTES: number;
    MAX_ATTEMPTS: number;
    SKIP_OTP: boolean;
  };
  JWT: {
    EXPIRY_DAYS: number;
  };
  INVITATION: {
    EXPIRY_DAYS: number;
  };
  MANIFEST: {
    DEFAULT_VERSION: number;
  };
  STRIPE: {
    SECRET_KEY: string;
    WEBHOOK_SECRET: string;
    USE_MOCK: boolean;
    METER: {
      CREDIT_USAGE_METER_ID: string;
      CREDIT_USAGE_EVENT_NAME: string;
      CREDIT_USAGE_MANIFEST_CREATE: number;
    };
    BILLING_THRESHOLD_BASIC: number;
    MONTHLY_BILLING_CYCLE: "MONTHLY";
    YEARLY_BILLING_CYCLE: "YEARLY";
    PRODUCTS: {
      BASIC: {
        NAME: "BASIC";
        MONTHLY: {
          PRICE_ID: string;
        };
      };
      PRO: {
        NAME: "PRO";
        MONTHLY: {
          PRICE_ID: string;
        };
        YEARLY: {
          PRICE_ID: string;
        };
      };
      PREMIUM: {
        NAME: "PREMIUM";
        MONTHLY: {
          PRICE_ID: string;
        };
        YEARLY: {
          PRICE_ID: string;
        };
      };
      CUSTOM: {
        NAME: "CUSTOM";
      };
    };
  };
  PAGINATION: {
    MAX_LIMIT: number;
  };
  DATABASE: {
    HOST: string;
    PORT: number;
    USER: string;
    PASSWORD: string;
    DATABASE: string;
  };
  EMAIL: {
    RESEND_API_KEY: string;
    FROM_EMAIL: string;
    USE_CONSOLE: boolean;
  };
  SENTRY: {
    DSN: string | undefined;
  };
  GCP_BUCKET: {
    USE_MOCK_GCP_STORAGE: boolean;
    PROJECT_ID: string;
    MANIFEST_BUCKET_NAME: string;
    TEMPORARY_BUCKET_NAME: string;
    SIGNED_URL_EXPIRY_SECONDS: number;
  };
  LABELER: {
    LABELER_API_KEY: string;
    SKIP_CLOUD_TASK: boolean;
    SERVICE_URL: string;
  };
} = {
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
    MONTHLY_BILLING_CYCLE: "MONTHLY" as const,
    YEARLY_BILLING_CYCLE: "YEARLY" as const,
    PRODUCTS: {
      BASIC: {
        NAME: "BASIC" as const,
        MONTHLY: {
          PRICE_ID: getEnv(
            "STRIPE_PRODUCT_BASIC_MONTHLY_PRICE_ID",
            "price_basic_monthly",
          ),
        },
      },
      PRO: {
        NAME: "PRO" as const,
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
        NAME: "PREMIUM" as const,
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
      CUSTOM: {
        NAME: "CUSTOM" as const,
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
    USE_MOCK_GCP_STORAGE: getEnv("USE_MOCK_GCP_STORAGE", "false") === "true",
    PROJECT_ID: getEnv("GCP_PROJECT_ID", "your-project-id"),
    MANIFEST_BUCKET_NAME: getEnv(
      "GCP_MANIFEST_BUCKET_NAME",
      "your-bucket-name",
    ),
    TEMPORARY_BUCKET_NAME: getEnv(
      "GCP_TEMPORARY_BUCKET_NAME",
      "your-bucket-name",
    ),
    SIGNED_URL_EXPIRY_SECONDS: 60 * 60,
  },
  LABELER: {
    LABELER_API_KEY: getEnv("LABELER_API_KEY", "labeler_api_key"),
    SKIP_CLOUD_TASK: getEnv("LABELER_SKIP_CLOUD_TASK", "false") === "true",
    SERVICE_URL: getEnv("LABELER_SERVICE_URL", "http://localhost:4001"),
  },
};

export default settings;
