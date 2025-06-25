import { Router, Status } from "@oak/oak";
import { authMiddleware, getSession } from "../auth/middleware.ts";
import {
  startLabelingPayloadSchema,
  uploadTemporaryContentPayloadSchema,
} from "./types.ts";
import { LabelingService } from "./service.ts";

const router = new Router();

router.post("/temp", authMiddleware, async (ctx) => {
  const body = await ctx.request.body.json();

  const parsedBody = uploadTemporaryContentPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const labelingService = new LabelingService();

  const response = await labelingService.uploadTemporaryContent(
    parsedBody.data.path,
    parsedBody.data.content,
  );

  ctx.response.body = response;
});

router.post("/request", authMiddleware, async (ctx) => {
  const session = getSession(ctx);

  const body = await ctx.request.body.json();

  const parsedBody = startLabelingPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const labelingService = new LabelingService();

  const response = await labelingService.startLabeling(
    session.userId,
    parsedBody.data.manifestId,
    parsedBody.data.fileMapName,
  );

  if ("error" in response) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = response;
});

export default router;
