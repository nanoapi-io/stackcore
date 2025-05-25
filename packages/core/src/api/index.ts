import { Application } from "@oak/oak";
import authRouter from "./auth/router.ts";
import organizationRouter from "./organization/router.ts";
import invitationRouter from "./invitation/router.ts";
import memberRouter from "./member/router.ts";
import projectRouter from "./project/router.ts";
import healthRouter from "./health/router.ts";
import billingRouter from "./billing/router.ts";

const api = new Application();

api.use((ctx, next) => {
  // Set CORS headers
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

api.use(healthRouter.prefix("/health").routes());
api.use(healthRouter.allowedMethods());

api.use(authRouter.prefix("/auth").routes());
api.use(authRouter.allowedMethods());

api.use(organizationRouter.prefix("/organizations").routes());
api.use(organizationRouter.allowedMethods());

api.use(invitationRouter.prefix("/invitations").routes());
api.use(invitationRouter.allowedMethods());

api.use(memberRouter.prefix("/members").routes());
api.use(memberRouter.allowedMethods());

api.use(projectRouter.prefix("/projects").routes());
api.use(projectRouter.allowedMethods());

api.use(billingRouter.prefix("/billing").routes());
api.use(billingRouter.allowedMethods());

export default api;
