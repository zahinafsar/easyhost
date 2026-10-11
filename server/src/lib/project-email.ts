import type { z } from "zod";
import { prisma } from "./prisma.js";
import { EMAIL_DOMAIN, EmailUsageLimitError, senderAddress, sendCustomerEmail } from "./email.js";
import { LIMITS } from "./limits.js";
import type { sendEmailSchema } from "./validations.js";

type SendResult =
  | { ok: true; id: string; from: string }
  | { ok: false; error: string; status: 400 | 429 | 502 | 503 };

export const sendProjectEmail = async (projectId: string, payload: z.infer<typeof sendEmailSchema>): Promise<SendResult> => {
  let to = payload.to;
  if (typeof to === "string") {
    to = [to];
  }

  const [username, domain] = payload.from.toLowerCase().split("@");
  let sender = null;
  if (domain === EMAIL_DOMAIN) {
    sender = await prisma.emailSender.findFirst({ where: { projectId, username } });
  }
  if (!sender) {
    return { ok: false, error: `"${payload.from}" is not one of your sender addresses. Create it first.`, status: 400 };
  }
  const from = senderAddress(sender.username);

  const dailyLimit = LIMITS.emailsPerDay;
  const sentToday = await prisma.emailLog.count({
    where: { projectId, status: "SENT", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (sentToday >= dailyLimit) {
    return { ok: false, error: `Daily email limit of ${dailyLimit} reached`, status: 429 };
  }

  try {
    const { id } = await sendCustomerEmail({ ...payload, from, to });
    const log = await prisma.emailLog.create({
      data: { projectId, from, to, subject: payload.subject, status: "SENT", resendId: id },
    });
    return { ok: true, id: log.id, from };
  } catch (error) {
    let message = "Email failed";
    if (error instanceof Error) {
      message = error.message;
    }
    await prisma.emailLog.create({
      data: { projectId, from, to, subject: payload.subject, status: "FAILED", error: message },
    });
    return { ok: false, error: message, status: error instanceof EmailUsageLimitError ? 503 : 502 };
  }
};
