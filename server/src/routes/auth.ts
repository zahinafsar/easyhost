import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { createToken, generateToken, hashPassword, removeAuthCookie, setAuthCookie, verifyPassword } from "../lib/auth.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { checkVerificationCode, resendWaitSeconds, sendVerificationCode } from "../lib/verify-code.js";
import { emailDomain } from "../lib/email-domains.js";
import { validate } from "../lib/validator.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateProfileSchema, verifyEmailSchema } from "../lib/validations.js";
import { requireSession, requireUser } from "../middleware/require-user.js";

export const authRoutes = new Hono()
  .post("/register", validate("json", registerSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");

    const blockedDomain = await prisma.blockedDomain.findUnique({ where: { domain: emailDomain(email) } });
    if (blockedDomain) {
      return c.json({ error: "This email address cannot be used to register" }, 403);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: await hashPassword(password),
        apps: {
          create: {
            name: "Default project",
            appEnabled: false,
            slug: `project-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
          },
        },
      },
    });

    try {
      await sendVerificationCode(user);
    } catch (error) {
      console.error("Failed to send verification code", error);
    }

    const token = await createToken({ userId: user.id, email: user.email });
    setAuthCookie(c, token);

    return c.json({
      message: "Registration successful. Enter the 6-digit code we sent to your email.",
      token,
      user: { id: user.id, email: user.email, name: user.name, verified: user.verified },
    });
  })
  .post("/login", validate("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.password))) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    if (user.blocked) {
      return c.json({ error: "Your account has been blocked" }, 403);
    }
    if (!user.verified && (!user.verifyCodeExpires || user.verifyCodeExpires.getTime() < Date.now())) {
      await sendVerificationCode(user).catch((error) => console.error("Failed to send verification code", error));
    }

    const token = await createToken({ userId: user.id, email: user.email });
    setAuthCookie(c, token);

    return c.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, verified: user.verified },
    });
  })
  .post("/logout", (c) => {
    removeAuthCookie(c);
    return c.json({ message: "Logged out" });
  })
  .post("/stop-impersonating", requireSession, async (c) => {
    const { impersonatorId } = c.get("user");
    if (!impersonatorId) {
      return c.json({ error: "Not impersonating anyone" }, 400);
    }
    const admin = await prisma.user.findUnique({ where: { id: impersonatorId } });
    if (!admin || admin.blocked || admin.role !== "ADMIN") {
      removeAuthCookie(c);
      return c.json({ error: "Admin session is no longer valid" }, 401);
    }
    const token = await createToken({ userId: admin.id, email: admin.email });
    setAuthCookie(c, token);
    return c.json({ message: "Impersonation ended" });
  })
  .get("/me", requireSession, (c) => {
    return c.json({ user: c.get("user") });
  })
  .put("/me", requireUser, validate("json", updateProfileSchema), async (c) => {
    const user = await prisma.user.update({
      where: { id: c.get("user").id },
      data: c.req.valid("json"),
      select: { id: true, email: true, name: true, role: true, verified: true, createdAt: true },
    });
    return c.json({ user });
  })
  .post("/verify-email", requireSession, validate("json", verifyEmailSchema), async (c) => {
    const result = await checkVerificationCode(c.get("user").id, c.req.valid("json").code);
    if (!result.ok) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ message: "Email verified" });
  })
  .post("/resend-verification", requireSession, async (c) => {
    const current = c.get("user");
    if (current.verified) {
      return c.json({ message: "Email already verified" });
    }
    const { verifyCodeSentAt } = await prisma.user.findUniqueOrThrow({ where: { id: current.id }, select: { verifyCodeSentAt: true } });
    const wait = resendWaitSeconds(verifyCodeSentAt);
    if (wait > 0) {
      return c.json({ error: `Wait ${wait} seconds before sending another code` }, 429);
    }
    try {
      await sendVerificationCode(current);
    } catch {
      return c.json({ error: "Could not send verification code" }, 500);
    }
    return c.json({ message: `We sent a new code to ${current.email}` });
  })
  .post("/forgot-password", validate("json", forgotPasswordSchema), async (c) => {
    const { email } = c.req.valid("json");
    const message = "If an account exists with this email, you will receive a password reset link.";

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return c.json({ message });
    }

    const resetToken = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires: new Date(Date.now() + 60 * 60 * 1000) },
    });

    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (error) {
      console.error("Failed to send password reset email", error);
    }

    return c.json({ message });
  })
  .post("/reset-password", validate("json", resetPasswordSchema), async (c) => {
    const { token, password } = c.req.valid("json");

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetExpires: { gt: new Date() } },
    });
    if (!user) {
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password), resetToken: null, resetExpires: null },
    });

    return c.json({ message: "Password reset successfully" });
  });
