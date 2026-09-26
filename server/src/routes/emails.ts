import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { validate } from "../lib/validator.js";
import { createEmailSenderSchema, paginationSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import { senderAddress } from "../lib/email.js";
import { LIMITS } from "../lib/limits.js";
import type { UserEnv } from "../lib/types.js";
import { env } from "../lib/env.js";

const listSenders = async (userId: string) => {
  const senders = await prisma.emailSender.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return senders.map((sender) => ({
    id: sender.id,
    username: sender.username,
    address: senderAddress(sender.username),
    createdAt: sender.createdAt,
  }));
};

export const emailRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", validate("query", paginationSchema), async (c) => {
    const userId = c.get("user").id;
    const { page, limit } = c.req.valid("query");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [logs, total, sentToday, senders] = await Promise.all([
      prisma.emailLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailLog.count({ where: { userId } }),
      prisma.emailLog.count({ where: { userId, status: "SENT", createdAt: { gte: since } } }),
      listSenders(userId),
    ]);

    return c.json({
      logs,
      total,
      page,
      limit,
      sentToday,
      dailyLimit: env.emailDailyLimit,
      senders,
      maxSenders: LIMITS.emailSenders,
      domain: env.emailDomain,
    });
  })
  .post("/senders", validate("json", createEmailSenderSchema), async (c) => {
    const userId = c.get("user").id;
    const { username } = c.req.valid("json");

    const count = await prisma.emailSender.count({ where: { userId } });
    if (count >= LIMITS.emailSenders) {
      return c.json({ error: `You can have at most ${LIMITS.emailSenders} sender addresses` }, 400);
    }

    const taken = await prisma.emailSender.findUnique({ where: { username } });
    if (taken) {
      return c.json({ error: `${senderAddress(username)} is already taken` }, 400);
    }

    await prisma.emailSender.create({ data: { userId, username } });
    return c.json({ senders: await listSenders(userId) }, 201);
  })
  .delete("/senders/:id", async (c) => {
    const userId = c.get("user").id;
    const { count } = await prisma.emailSender.deleteMany({ where: { id: c.req.param("id"), userId } });
    if (!count) {
      return c.json({ error: "Sender not found" }, 404);
    }
    return c.json({ senders: await listSenders(userId) });
  });
