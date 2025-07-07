import { Router, Status } from "@oak/oak";
import { AuthService } from "./service.ts";
import { authMiddleware, getSession } from "./middleware.ts";
import z from "zod";

const router = new Router();

// Request OTP endpoint
router.post("/requestOtp", async (ctx) => {
  const body = await ctx.request.body.json();

  const requestOtpSchema = z.object({
    email: z.string().email(),
  });

  const parsedBody = requestOtpSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const authService = new AuthService();
  const response = await authService.requestOtp(parsedBody.data.email);

  if (response.error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: response.error };
    return;
  }

  ctx.response.status = Status.OK;
  ctx.response.body = { message: "OTP sent successfully" };
});

// Verify OTP endpoint
router.post("/verifyOtp", async (ctx) => {
  const body = await ctx.request.body.json();

  const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string(),
  });

  const parsedBody = verifyOtpSchema.safeParse(body);

  if (!parsedBody.success) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: parsedBody.error };
    return;
  }

  const authService = new AuthService();
  const { token, error } = await authService.verifyOtp(
    parsedBody.data.email,
    parsedBody.data.otp,
  );

  if (error) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error };
    return;
  }

  if (!token) throw new Error("No response from auth service");

  ctx.response.status = Status.OK;
  ctx.response.body = { token };
});

// Get info about the current user
router.get("/me", authMiddleware, (ctx) => {
  const session = getSession(ctx);

  ctx.response.body = { userId: session.userId, email: session.email };
});

export default router;
