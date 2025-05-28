import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";

// GET /health/liveness
Deno.test("liveness endpoint - should always return ok", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const response = await api.handle(
      new Request("http://localhost:3000/health/liveness", {
        method: "GET",
      }),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);

    const responseBody = await response?.json();
    assertEquals(responseBody.status, "ok");
    assertEquals(responseBody.service, "stackcore/core");
    assertEquals(typeof responseBody.timestamp, "string");

    // Verify timestamp is a valid ISO string
    const timestamp = new Date(responseBody.timestamp);
    assertEquals(
      timestamp instanceof Date && !isNaN(timestamp.getTime()),
      true,
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// GET /health/readiness
Deno.test("readiness endpoint - healthy database", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const response = await api.handle(
      new Request("http://localhost:3000/health/readiness", {
        method: "GET",
      }),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);

    const responseBody = await response?.json();
    assertEquals(responseBody.status, "ok");
    assertEquals(responseBody.service, "stackcore/core");
    assertEquals(typeof responseBody.timestamp, "string");
    assertEquals(responseBody.checks.database, true);

    // Verify timestamp is a valid ISO string
    const timestamp = new Date(responseBody.timestamp);
    assertEquals(
      timestamp instanceof Date && !isNaN(timestamp.getTime()),
      true,
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
