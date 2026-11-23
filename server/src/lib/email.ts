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

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const sendVerificationEmail = async (email: string, name: string, code: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${code} is your EasyHost verification code`,
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">Welcome, ${escapeHtml(name)}!</h1>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Enter this code to verify your email address. It expires in 10 minutes.
      </p>
      <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111; font-family: monospace;">${code}</p>
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

export const sendProjectDeletedEmail = async (email: string, name: string, projectName: string, projectHost: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your EasyHost project "${projectName}" was deleted`,
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">Your project was deleted</h1>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Hi ${escapeHtml(name)}, an EasyHost administrator deleted your project <strong>${escapeHtml(projectName)}</strong> (${escapeHtml(projectHost)}).
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        The app, its deployments, custom domains, storage bucket and database were removed and cannot be restored. Your account and other projects are not affected.
      </p>
      ${button(APP_URL, "Open dashboard")}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
        If you think this was a mistake, reply to this email.
      </p>
    `),
  });
};

export const sendAccountDeletedEmail = async (email: string, name: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your EasyHost account has been closed",
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">Your account has been closed</h1>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Hi ${escapeHtml(name)}, during a routine review our team identified unusual activity associated with your EasyHost account. To protect the security and reliability of the platform for all of our users, we have closed your account.
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Your account and all of its projects have been permanently deleted, including apps, deployments, custom domains, storage buckets, databases and any remaining AI tokens. This data cannot be restored.
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
        If you believe this decision was made in error, please reply to this email and our team will review your case.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
        This is an automated notice sent to ${escapeHtml(email)}.
      </p>
    `),
  });
};

export const inviteUrl = (token: string) => `${APP_URL}/invite/${token}`;

export const sendProjectInviteEmail = async (email: string, inviterName: string, projectName: string, token: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${inviterName} invited you to "${projectName}" on EasyHost`,
    html: emailLayout(`
      <h1 style="margin: 0 0 8px; font-size: 20px; color: #111;">You're invited</h1>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        ${escapeHtml(inviterName)} invited you to join the project <strong>${escapeHtml(projectName)}</strong> on EasyHost. Members can manage its apps, deploys, storage and database.
      </p>
      ${button(inviteUrl(token), "Accept invite")}
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
        This invite expires in 7 days. Log in or sign up with ${escapeHtml(email)} to accept it. If you weren't expecting it, you can ignore this email.
      </p>
    `),
  });
};
