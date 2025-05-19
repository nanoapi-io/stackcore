import { type RouterContext, type RouterMiddleware, Status } from "@oak/oak";
import { AuthService } from "./service.ts";

// Authentication middleware
export const authMiddleware: RouterMiddleware<string> = async (
  ctx: RouterContext<string>,
  next,
) => {
  const authHeader = ctx.request.headers.get("authorization");
  if (!authHeader) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Authorization header missing" };
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Invalid authorization header" };
    return;
  }

  const authService = new AuthService();

  const session = await authService.verifyToken(token);
  if (!session) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Invalid or expired token" };
    return;
  }

  ctx.state.session = session;
  await next();
};
