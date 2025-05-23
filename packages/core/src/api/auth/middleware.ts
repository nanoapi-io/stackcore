import { type RouterContext, type RouterMiddleware, Status } from "@oak/oak";
import { AuthService } from "./service.ts";
import { type Session, sessionSchema } from "./types.ts";

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

  const verifiedToken = await authService.verifyToken(token);

  if (!verifiedToken) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Invalid or expired token" };
    return;
  }

  ctx.state.session = {
    userId: verifiedToken.userId,
    email: verifiedToken.email,
  } as Session;

  await next();
};

export function getSession(ctx: RouterContext<string>) {
  const userId = ctx.state.session?.userId;
  const email = ctx.state.session?.email;

  const parsedSession = sessionSchema.safeParse({ userId, email });

  if (!parsedSession.success) {
    throw new Error("Invalid session");
  }

  return parsedSession.data;
}
