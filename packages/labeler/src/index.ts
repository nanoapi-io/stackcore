import { initKyselyDb } from "@stackcore/db";

import api from "./api/index.ts";
import * as Sentry from "@sentry/deno";
import settings from "@stackcore/settings";

if (settings.SENTRY.DSN) {
  console.info("Initializing Sentry...");
  Sentry.init({
    dsn: settings.SENTRY.DSN,
  });

  // Oak handles errors automatically
  // So we capture them here so sentry can get them
  api.addEventListener("error", (event) => {
    Sentry.captureException(event.error);
  });

  console.info("Sentry initialized");
} else {
  console.error("Skipping Sentry initialization, no DSN provided");
}

initKyselyDb();

console.info("Starting server...");
const port = 4001;
api.listen({ port });
console.info(`Server is running on port http://localhost:${port}`);
