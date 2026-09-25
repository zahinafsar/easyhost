import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { validate } from "../lib/validator.js";
import { paginationSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import { emailFrom } from "../lib/email.js";
import type { UserEnv } from "../lib/types.js";
import { env } from "../lib/env.js";

export const emailRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", validate("query", paginationSchema), async (c) => {
    const userId = c.get("user").id;
    const { page, limit } = c.req.valid("query");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [logs, total, sentToday] = await Promise.all([
      prisma.emailLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailLog.count({ where: { userId } }),
      prisma.emailLog.count({ where: { userId, status: "SENT", createdAt: { gte: since } } }),
    ]);

    return c.json({
      logs,
      total,
      page,
      limit,
      sentToday,
      dailyLimit: env.emailDailyLimit,
      from: emailFrom(),
    });
  });
