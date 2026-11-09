import { createMiddleware } from "hono/factory";
import { getCurrentUser } from "../lib/auth.js";
import type { UserEnv } from "../lib/types.js";

export const EMAIL_NOT_VERIFIED = "Verify your email to continue. Enter the 6-digit code we sent you.";

export const requireSession = createMiddleware<UserEnv>(async (c, next) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
});

export const requireUser = createMiddleware<UserEnv>(async (c, next) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (!user.verified && !user.impersonatorId) {
    return c.json({ error: EMAIL_NOT_VERIFIED, code: "EMAIL_NOT_VERIFIED" }, 403);
  }
  c.set("user", user);
  await next();
});
