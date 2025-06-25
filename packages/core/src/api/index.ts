import { Application } from "@oak/oak";
import authRouter from "./auth/router.ts";
import workspaceRouter from "./workspace/router.ts";
import invitationRouter from "./invitation/router.ts";
import memberRouter from "./member/router.ts";
import projectRouter from "./project/router.ts";
import manifestRouter from "./manifest/router.ts";
import healthRouter from "./health/router.ts";
import billingRouter from "./billing/router.ts";
import tokenRouter from "./token/router.ts";
import labelingRouter from "./labeling/router.ts";

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

api.use(healthRouter.prefix("/health").routes());
api.use(healthRouter.allowedMethods());

api.use(authRouter.prefix("/auth").routes());
api.use(authRouter.allowedMethods());

api.use(tokenRouter.prefix("/tokens").routes());
api.use(tokenRouter.allowedMethods());

api.use(workspaceRouter.prefix("/workspaces").routes());
api.use(workspaceRouter.allowedMethods());

api.use(invitationRouter.prefix("/invitations").routes());
api.use(invitationRouter.allowedMethods());

api.use(memberRouter.prefix("/members").routes());
api.use(memberRouter.allowedMethods());

api.use(projectRouter.prefix("/projects").routes());
api.use(projectRouter.allowedMethods());

api.use(manifestRouter.prefix("/manifests").routes());
api.use(manifestRouter.allowedMethods());

api.use(billingRouter.prefix("/billing").routes());
api.use(billingRouter.allowedMethods());

api.use(labelingRouter.prefix("/labeling").routes());
api.use(labelingRouter.allowedMethods());

export default api;
