import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma.js";
import { sendVerificationEmail } from "./email.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export const sendVerificationCode = async (user: { id: string; email: string; name: string }) => {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyCodeHash: hashCode(code),
      verifyCodeExpires: new Date(Date.now() + CODE_TTL_MS),
      verifyCodeSentAt: new Date(),
      verifyAttempts: 0,
    },
  });
  await sendVerificationEmail(user.email, user.name, code);
};

export const resendWaitSeconds = (sentAt: Date | null) => {
  if (!sentAt) {
    return 0;
  }
  return Math.max(0, Math.ceil((sentAt.getTime() + RESEND_COOLDOWN_MS - Date.now()) / 1000));
};

type CheckResult = { ok: true } | { ok: false; error: string };

export const checkVerificationCode = async (userId: string, code: string): Promise<CheckResult> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { verified: true, verifyCodeHash: true, verifyCodeExpires: true, verifyAttempts: true },
  });
  if (user.verified) {
    return { ok: true };
  }
  if (!user.verifyCodeHash || !user.verifyCodeExpires || user.verifyCodeExpires.getTime() < Date.now()) {
    return { ok: false, error: "This code has expired. Send a new code." };
  }
  if (user.verifyAttempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many wrong codes. Send a new code." };
  }

  const expected = Buffer.from(user.verifyCodeHash, "hex");
  const given = Buffer.from(hashCode(code), "hex");
  if (!timingSafeEqual(expected, given)) {
    await prisma.user.update({ where: { id: userId }, data: { verifyAttempts: { increment: 1 } } });
    return { ok: false, error: "Wrong code. Check your email and try again." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { verified: true, verifyCodeHash: null, verifyCodeExpires: null, verifyCodeSentAt: null, verifyAttempts: 0 },
  });
  return { ok: true };
};
