import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";
import { emailFrom, sendCustomerEmail } from "../../lib/email.js";
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

    const dailyLimit = env.emailDailyLimit;
    const sentToday = await prisma.emailLog.count({
      where: { userId, status: "SENT", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (sentToday >= dailyLimit) {
      return c.json({ error: `Daily email limit of ${dailyLimit} reached` }, 429);
    }

    try {
      const { id, from } = await sendCustomerEmail({ ...payload, to });
      const log = await prisma.emailLog.create({
        data: { userId, from, to, subject: payload.subject, status: "SENT", resendId: id },
      });
      return c.json({ id: log.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email failed";
      await prisma.emailLog.create({
        data: { userId, from: emailFrom(), to, subject: payload.subject, status: "FAILED", error: message },
      });
      return c.json({ error: message }, 502);
    }
  });
