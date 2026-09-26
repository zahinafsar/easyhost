import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";
import { senderAddress, sendCustomerEmail } from "../../lib/email.js";
import { validate } from "../../lib/validator.js";
import { sendEmailSchema } from "../../lib/validations.js";
import { requireApiKey } from "../../middleware/require-api-key.js";
import type { ApiKeyEnv } from "../../lib/types.js";
import { env } from "../../lib/env.js";


export const v1EmailRoutes = new Hono<ApiKeyEnv>()
  .use(requireApiKey)
  .post("/send", validate("json", sendEmailSchema), async (c) => {
    const userId = c.get("userId");
    const payload = c.req.valid("json");
    let to = payload.to;
    if (typeof to === "string") {
      to = [to];
    }

    const [username, domain] = payload.from.toLowerCase().split("@");
    let sender = null;
    if (domain === env.emailDomain) {
      sender = await prisma.emailSender.findFirst({ where: { userId, username } });
    }
    if (!sender) {
      return c.json({ error: `"${payload.from}" is not one of your sender addresses. Create it on the Email page first.` }, 400);
    }
    const from = senderAddress(sender.username);

    const dailyLimit = env.emailDailyLimit;
    const sentToday = await prisma.emailLog.count({
      where: { userId, status: "SENT", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (sentToday >= dailyLimit) {
      return c.json({ error: `Daily email limit of ${dailyLimit} reached` }, 429);
    }

    try {
      const { id } = await sendCustomerEmail({ ...payload, from, to });
      const log = await prisma.emailLog.create({
        data: { userId, from, to, subject: payload.subject, status: "SENT", resendId: id },
      });
      return c.json({ id: log.id, from });
    } catch (error) {
      let message = "Email failed";
      if (error instanceof Error) {
        message = error.message;
      }
      await prisma.emailLog.create({
        data: { userId, from, to, subject: payload.subject, status: "FAILED", error: message },
      });
      return c.json({ error: message }, 502);
    }
  });
