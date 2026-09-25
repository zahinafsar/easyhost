import { Resend } from "resend";
import { env } from "./env.js";

const resend = new Resend(env.resendApiKey);
const APP_URL = env.appUrl;
const FROM_EMAIL = env.emailFrom;

const emailLayout = (content: string) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #111;">EasyHost</h2>
      </div>
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px;">
        ${content}
      </div>
      <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} EasyHost. All rights reserved.
      </p>
    </div>
  `;
};

const button = (href: string, label: string) => {
  return `
    <a href="${href}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 8px;">
      ${label}
    </a>
  `;
};

export const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const sendVerificationEmail = async (email: string, name: string, token: string) => {
  const verifyUrl = `${APP_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Verify your EasyHost account",
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">Welcome, ${escapeHtml(name)}!</h1>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Thanks for signing up. Please verify your email address to get started.
      </p>
      ${button(verifyUrl, "Verify Email")}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    `),
  });
};

export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Reset your EasyHost password",
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">Reset your password</h1>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${escapeHtml(name)}, we received a request to reset your password. Click the button below to choose a new one.
      </p>
      ${button(resetUrl, "Reset Password")}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
      </p>
    `),
  });
};

export const sendCustomerEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}) => {
  const base = { from: FROM_EMAIL, to, subject, replyTo };
  let result;
  if (html) {
    result = await resend.emails.send({ ...base, html, text });
  } else {
    result = await resend.emails.send({ ...base, text: text ?? "" });
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { id: result.data?.id ?? null, from: FROM_EMAIL };
};

export const emailFrom = () => FROM_EMAIL;
