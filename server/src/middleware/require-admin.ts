import { createMiddleware } from "hono/factory";
import { getCurrentUser } from "../lib/auth.js";
import type { UserEnv } from "../lib/types.js";

export const requireAdmin = createMiddleware<UserEnv>(async (c, next) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (user.role !== "ADMIN" || user.impersonatorId) {
    return c.json({ error: "Admin access required" }, 403);
  }
  c.set("user", user);
  await next();
});
