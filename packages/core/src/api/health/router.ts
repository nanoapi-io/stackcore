import { Router } from "@oak/oak";

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = { status: "ok" };
});

router.get("/health", (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = { status: "ok" };
});

export default router;
