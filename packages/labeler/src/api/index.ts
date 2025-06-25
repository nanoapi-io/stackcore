import { Application, Router, Status } from "@oak/oak";
import { db } from "@stackcore/db";
import { z } from "zod";
import { startLabeling } from "../labeler/index.ts";
import settings from "@stackcore/settings";

const api = new Application();

api.use((ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  return next();
});

// log all requests
api.use((ctx, next) => {
  console.info(`${ctx.request.method} ${ctx.request.url}`);
  return next();
});

// check api key is valid
api.use((ctx, next) => {
  const apiKey = ctx.request.headers.get("X-API-KEY");
  if (apiKey !== settings.LABELER.LABELER_API_KEY) {
    ctx.response.status = Status.Unauthorized;
    return;
  }
  return next();
});

const router = new Router();

router.get("/health/liveness", (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "stackcore/labeler",
  };
});

router.get("/health/readiness", async (ctx) => {
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
    service: "stackcore/labeler",
    checks,
  };
});

router.post("/start", async (ctx) => {
  const body = await ctx.request.body.json();

  const labelingStartSchema = z.object({
    manifestId: z.number(),
    fileMapName: z.string(),
  });

  const parsedBody = labelingStartSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  startLabeling(
    parsedBody.data.manifestId,
    parsedBody.data.fileMapName,
  );

  ctx.response.status = Status.OK;
  ctx.response.body = {
    status: "ok",
  };
});

api.use(router.routes());
api.use(router.allowedMethods());

export default api;
