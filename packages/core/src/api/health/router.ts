import { Router, Status } from "@oak/oak";
import { db } from "../../db/database.ts";

const router = new Router();

router.get("/liveness", (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "stackcore/core",
  };
});

router.get("/readiness", async (ctx) => {
  const checks = {
    database: false,
  };

  let overallStatus = "ok";
  let statusCode = Status.OK;

  try {
    // Check database connectivity
    await db.selectFrom("user").select("id").limit(1).execute();
    checks.database = true;
  } catch (error) {
    console.error("Database health check failed:", error);
    checks.database = false;
    overallStatus = "error";
    statusCode = Status.ServiceUnavailable;
  }

  ctx.response.status = statusCode;
  ctx.response.body = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: "stackcore/core",
    checks,
  };
});

export default router;
