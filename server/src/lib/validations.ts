import { z } from "zod";
import { NODE_VERSIONS } from "./build-plan.js";
import { TOKEN_PACKS } from "./tokens.js";
import { LIMITS } from "./limits.js";

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
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
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

export const isReservedEmailUsername = (username: string) => RESERVED_EMAIL_USERNAMES.includes(username);

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
  "help", "support", "cdn", "static", "assets", "auth", "login", "console", "caddy", "minio", "db", "root", "registry",
];

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().max(100).default(""),
});

export const adminAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(30),
});

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
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(40, "Name must be at most 40 characters"),
});

export const updateProjectSchema = createAppSchema;

export const isReservedAppName = (name: string) => RESERVED_APP_NAMES.includes(name);

export const updateEnvSchema = z.object({
  env: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Invalid env var name"), z.string()),
});

const buildCommand = z
  .string()
  .trim()
  .max(500, "Command must be at most 500 characters")
  .refine((value) => !/[\r\n]/.test(value), "Command must be a single line")
  .transform((value) => value || null);

export const updateBuildSchema = z.object({
  nodeVersion: z.enum(NODE_VERSIONS).nullable(),
  rootDir: z
    .string()
    .trim()
    .transform((value) => value.replace(/^(\.\/|\/)+/, "").replace(/\/+$/, ""))
    .refine(
      (value) => !value || (/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(value) && !value.split("/").some((part) => part === "." || part === "..")),
      "Use a relative path like apps/web",
    )
    .transform((value) => value || null),
  installCommand: buildCommand,
  buildCommand,
  startCommand: buildCommand,
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const logsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(2000).default(200),
});

export const scheduleSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name must be at most 60 characters"),
  url: z.url().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use an HTTP or HTTPS URL without embedded credentials"),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]),
  headers: z.record(
    z.string().regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/).refine((name) => !["host", "connection", "content-length", "transfer-encoding", "upgrade", "trailer", "expect"].includes(name.toLowerCase()) && !name.toLowerCase().startsWith("proxy-"), "This header is managed by the scheduler"),
    z.string().max(4096).refine((value) => /^[\t\x20-\x7e\x80-\xff]*$/.test(value), "Header values must contain valid HTTP header characters"),
  ).refine((headers) => Object.keys(headers).length <= 20, "Use at most 20 headers"),
  body: z.string().max(16_384, "Body must be at most 16 KB").refine((value) => Buffer.byteLength(value, "utf8") <= 16_384, "Body must be at most 16 KB").nullable(),
  intervalMinutes: z.number().int().min(1, "Interval must be at least 1 minute").max(43_200, "Interval must be at most 30 days"),
  enabled: z.boolean(),
}).refine((value) => !["GET", "HEAD"].includes(value.method) || !value.body, { message: "GET and HEAD requests cannot have a body", path: ["body"] });

export const scheduleStateSchema = z.object({ enabled: z.boolean() });

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email address")),
});

export const aiAppNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Name must be at least 2 characters")
  .max(40, "Name must be at most 40 characters")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Use lowercase letters, numbers and dashes, starting and ending with a letter or number")
  .refine((name) => !isReservedAppName(name), "This name is reserved");

export const createAiAppSchema = z.object({ name: aiAppNameSchema });

export const aiAppAvailabilitySchema = z.object({ name: z.string() });

export const aiElementSchema = z.object({
  tag: z.string().max(40),
  selector: z.string().max(400),
  text: z.string().max(400),
  html: z.string().max(1000),
  page: z.string().max(300),
});

export type AiElement = z.infer<typeof aiElementSchema>;

export const aiPromptSchema = z.object({
  prompt: z.string().trim().min(1, "Describe what to build").max(8000, "Prompt is too long"),
  elements: z.array(aiElementSchema).max(5, "Select at most 5 elements").default([]),
  attachments: z
    .array(z.string().regex(/^public\/uploads\/[a-z0-9._-]+$/, "Invalid attachment"))
    .max(LIMITS.aiAttachments, `Attach at most ${LIMITS.aiAttachments} images`)
    .default([]),
});

export const aiFileQuerySchema = z.object({ path: z.string().min(1) });

export const aiWriteFileSchema = z.object({
  path: z.string().trim().min(1, "File path is required").max(300),
  content: z.string(),
});

export const aiRespondSchema = z.object({
  stepId: z.string().min(1),
  answers: z.record(z.string(), z.string().trim().max(500)).optional(),
  approve: z.literal(true).optional(),
  theme: z.string().optional(),
});

export const tokenCheckoutSchema = z.object({
  pack: z.enum(TOKEN_PACKS.map((pack) => pack.id) as [string, ...string[]], "Choose a token pack"),
});
