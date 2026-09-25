import { createMiddleware } from "hono/factory";
import { getCurrentUser } from "../lib/auth.js";
import type { UserEnv } from "../lib/types.js";

export const requireUser = createMiddleware<UserEnv>(async (c, next) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
});
