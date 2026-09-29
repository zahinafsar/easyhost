import { createMiddleware } from "hono/factory";
import { prisma } from "../lib/prisma.js";
import { API_KEY_PREFIX, hashApiKey } from "../lib/api-key.js";
import type { ApiKeyEnv } from "../lib/types.js";

export const requireApiKey = createMiddleware<ApiKeyEnv>(async (c, next) => {
  const header = c.req.header("authorization");
  let key = c.req.header("x-api-key");
  if (!key && header?.startsWith("Bearer ")) {
    key = header.slice(7).trim();
  }

  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return c.json({ error: "Missing or invalid API key" }, 401);
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { hash: hashApiKey(key) },
    include: { project: { include: { user: { select: { blocked: true } } } } },
  });

  if (!apiKey || apiKey.project.user.blocked) {
    return c.json({ error: "Missing or invalid API key" }, 401);
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  c.set("projectId", apiKey.projectId);
  await next();
});
