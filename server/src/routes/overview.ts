import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

export const overviewRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [apps, runningApps, buckets, databases, emailsToday, apiKeys] = await Promise.all([
      prisma.app.count({ where: { userId } }),
      prisma.app.count({ where: { userId, status: "RUNNING" } }),
      prisma.bucket.count({ where: { userId } }),
      prisma.sqliteDatabase.count({ where: { userId } }),
      prisma.emailLog.count({ where: { userId, status: "SENT", createdAt: { gte: since } } }),
      prisma.apiKey.count({ where: { userId } }),
    ]);

    return c.json({ apps, runningApps, buckets, databases, emailsToday, apiKeys });
  });
