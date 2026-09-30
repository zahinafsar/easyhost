import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { validate } from "../lib/validator.js";
import { createEmailSenderSchema, paginationSchema, sendEmailSchema } from "../lib/validations.js";
import { sendProjectEmail } from "../lib/project-email.js";
import { requireUser } from "../middleware/require-user.js";
import { requireProject } from "../middleware/require-project.js";
import { EMAIL_DOMAIN, senderAddress } from "../lib/email.js";
import { LIMITS } from "../lib/limits.js";
import type { UserEnv } from "../lib/types.js";

const listSenders = async (projectId: string) => {
  const senders = await prisma.emailSender.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
  return senders.map((sender) => ({
    id: sender.id,
    username: sender.username,
    address: senderAddress(sender.username),
    createdAt: sender.createdAt,
  }));
};

export const emailRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/", validate("query", paginationSchema), async (c) => {
    const projectId = c.get("projectId");
    const { page, limit } = c.req.valid("query");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [logs, total, sentToday, senders] = await Promise.all([
      prisma.emailLog.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailLog.count({ where: { projectId } }),
      prisma.emailLog.count({ where: { projectId, status: "SENT", createdAt: { gte: since } } }),
      listSenders(projectId),
    ]);

    return c.json({
      logs,
      total,
      page,
      limit,
      sentToday,
      dailyLimit: LIMITS.emailsPerDay,
      senders,
      maxSenders: LIMITS.emailSenders,
      domain: EMAIL_DOMAIN,
    });
  })
  .post("/senders", validate("json", createEmailSenderSchema), async (c) => {
    const projectId = c.get("projectId");
    const { username } = c.req.valid("json");

    const existing = await prisma.emailSender.findUnique({ where: { projectId } });
    if (existing) {
      return c.json({ error: "This project already has a sender address" }, 400);
    }

    const taken = await prisma.emailSender.findUnique({ where: { username } });
    if (taken) {
      return c.json({ error: `${senderAddress(username)} is already taken` }, 400);
    }

    await prisma.emailSender.create({ data: { projectId, username } });
    return c.json({ senders: await listSenders(projectId) }, 201);
  })
  .delete("/senders/:id", async (c) => {
    const projectId = c.get("projectId");
    const { count } = await prisma.emailSender.deleteMany({ where: { id: c.req.param("id"), projectId } });
    if (!count) {
      return c.json({ error: "Sender not found" }, 404);
    }
    return c.json({ senders: await listSenders(projectId) });
  })
  .post("/send", validate("json", sendEmailSchema), async (c) => {
    const result = await sendProjectEmail(c.get("projectId"), c.req.valid("json"));
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ id: result.id, from: result.from });
  });
