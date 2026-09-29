import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { createToken, generateToken, hashPassword, removeAuthCookie, setAuthCookie, verifyPassword } from "../lib/auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import { validate } from "../lib/validator.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateProfileSchema, verifyEmailSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";

export const authRoutes = new Hono()
  .post("/register", validate("json", registerSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return c.json({ error: "Email already registered" }, 400);
    }

    const verifyToken = generateToken();
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: await hashPassword(password),
        verifyToken,
        apps: {
          create: {
            name: "Default project",
            slug: `project-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
          },
        },
      },
    });

    try {
      await sendVerificationEmail(user.email, user.name, verifyToken);
    } catch (error) {
      console.error("Failed to send verification email", error);
    }

    const token = await createToken({ userId: user.id, email: user.email });
    setAuthCookie(c, token);

    return c.json({
      message: "Registration successful. Please check your email to verify your account.",
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
  .get("/me", requireUser, (c) => {
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
  .post("/verify-email", validate("json", verifyEmailSchema), async (c) => {
    const { token } = c.req.valid("json");

    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) {
      return c.json({ error: "Invalid or expired verification token" }, 400);
    }
    if (user.verified) {
      return c.json({ message: "Email already verified" });
    }

    await prisma.user.update({ where: { id: user.id }, data: { verified: true, verifyToken: null } });
    return c.json({ message: "Email verified successfully" });
  })
  .post("/resend-verification", requireUser, async (c) => {
    const current = c.get("user");
    if (current.verified) {
      return c.json({ message: "Email already verified" });
    }

    const verifyToken = generateToken();
    await prisma.user.update({ where: { id: current.id }, data: { verifyToken } });

    try {
      await sendVerificationEmail(current.email, current.name, verifyToken);
    } catch {
      return c.json({ error: "Could not send verification email" }, 500);
    }
    return c.json({ message: "Verification email sent" });
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
