function getEnv(key: string, defaultValue: string) {
  const value = Deno.env.get(key);

  if (value) return value;

  if (defaultValue) return defaultValue;

  throw new Error(`Environment variable ${key} is not set`);
}

export default {
  SECRET_KEY: getEnv("SECRET_KEY", "secret"),
  OTP: {
    EXPIRY_MINUTES: parseInt(getEnv("OTP_EXPIRY_MINUTES", "10")),
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
    USE_MOCK: Boolean(getEnv("STRIPE_USE_MOCK", "false")),
    CREDIT_USAGE_METER_EVENT_NAME: getEnv(
      "STRIPE_CREDIT_USAGE_METER_EVENT_NAME",
      "credits-usage",
    ),
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
