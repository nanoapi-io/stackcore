import { type RouterContext, type RouterMiddleware, Status } from "@oak/oak";
import { AuthService } from "./service.ts";
import { TokenService } from "../token/service.ts";
import z from "zod";

export const sessionSchema = z.object({
  userId: z.number(),
  email: z.string(),
});
export type Session = {
  userId: number;
  email: string;
};

export const authMiddleware: RouterMiddleware<string> = async (
  ctx: RouterContext<string>,
  next,
) => {
  const authHeader = ctx.request.headers.get("authorization");
  const apiTokenHeader = ctx.request.headers.get("x-api-token");

  let verifiedUser: { userId: number; email: string } | false = false;

  // Try JWT authentication first (takes precedence)
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (!token) {
      ctx.response.status = Status.Unauthorized;
      ctx.response.body = { error: "Invalid authorization header" };
      return;
    }

    const authService = new AuthService();
    verifiedUser = await authService.verifyToken(token);
  } // Try API token authentication if JWT failed or wasn't provided
  else if (apiTokenHeader) {
    const tokenService = new TokenService();
    verifiedUser = await tokenService.verifyApiToken(apiTokenHeader);
  }

  // If no authentication method provided
  if (!authHeader && !apiTokenHeader) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Authorization header missing" };
    return;
  }

  // If authentication failed
  if (!verifiedUser) {
    ctx.response.status = Status.Unauthorized;
    ctx.response.body = { error: "Invalid or expired token" };
    return;
  }

  ctx.state.session = {
    userId: verifiedUser.userId,
    email: verifiedUser.email,
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
