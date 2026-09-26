import { z } from "zod";

const resourceName = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(40, "Name must be at most 40 characters")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes");

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name too long"),
});

export const createBucketSchema = z.object({
  name: resourceName,
});

export const listObjectsSchema = z.object({
  prefix: z.string().optional(),
});

export const objectKeySchema = z.object({
  key: z.string().min(1, "Object key is required"),
});

export const createDatabaseSchema = z.object({
  name: resourceName,
});

export const runQuerySchema = z.object({
  sql: z.string().min(1, "SQL is required").max(100_000, "SQL too long"),
});

const RESERVED_EMAIL_USERNAMES = [
  "hello", "support", "admin", "administrator", "noreply", "no-reply", "postmaster", "abuse", "security",
  "billing", "root", "webmaster", "hostmaster", "info", "team", "mail", "mailer-daemon", "easyhost", "help",
];

const emailUsernameSchema = z
  .string()
  .min(2, "Username must be at least 2 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-z0-9]+([._-][a-z0-9]+)*$/, "Use lowercase letters, numbers, dots, dashes or underscores")
  .refine((username) => !RESERVED_EMAIL_USERNAMES.includes(username), "This email username is reserved");

export const createEmailSenderSchema = z.object({
  username: emailUsernameSchema,
});

export const sendEmailSchema = z.object({
  from: z.email("from must be one of your sender addresses, e.g. you@easyhost.fun"),
  to: z.union([z.email(), z.array(z.email()).min(1).max(50)]),
  subject: z.string().min(1, "Subject is required").max(300, "Subject too long"),
  html: z.string().optional(),
  text: z.string().optional(),
  replyTo: z.email().optional(),
}).refine((data) => !!data.html || !!data.text, {
  message: "Either html or text is required",
  path: ["html"],
});

const RESERVED_APP_NAMES = [
  "api", "app", "www", "storage", "admin", "dashboard", "mail", "email", "smtp", "docs", "blog", "status",
  "help", "support", "cdn", "static", "assets", "auth", "login", "console", "caddy", "minio", "db", "root",
];

export const tableRowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const updateCellSchema = z.object({
  key: z.record(z.string(), z.string().nullable()),
  column: z.string().min(1, "Column is required"),
  value: z.string().nullable(),
});

export const addDomainSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .max(253, "Domain is too long")
    .regex(/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "Enter a domain like www.example.com"),
});

export const createAppSchema = z.object({
  name: resourceName.refine((name) => !RESERVED_APP_NAMES.includes(name), "This app name is reserved"),
});

export const updateEnvSchema = z.object({
  env: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Invalid env var name"), z.string()),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const logsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(2000).default(200),
});
