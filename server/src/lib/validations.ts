import { z } from "zod";
import { NODE_VERSIONS } from "./build-plan.js";
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

const RESERVED_APP_NAMES = [
  "api", "app", "www", "storage", "admin", "dashboard", "mail", "email", "smtp", "docs", "blog", "status",
  "help", "support", "cdn", "static", "assets", "auth", "login", "console", "caddy", "minio", "db", "root", "registry",
];

const adminPage = z.coerce.number().int().min(1).default(1);
const adminSearch = z.string().trim().max(100).default("");

export const adminUsersQuerySchema = z.object({
  page: adminPage,
  search: adminSearch,
  plan: z.enum(["all", "free", "pro"]).default("all"),
  state: z.enum(["all", "verified", "unverified", "blocked", "admin"]).default("all"),
  sort: z.enum(["newest", "oldest", "active", "projects"]).default("newest"),
});

export const adminProjectsQuerySchema = z.object({
  page: adminPage,
  search: adminSearch,
  state: z.enum(["all", "running", "stopped", "suspended"]).default("all"),
  sort: z.enum(["newest", "oldest", "updated", "name"]).default("newest"),
});

export const adminRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const adminPagedRangeQuerySchema = adminRangeQuerySchema.extend({
  page: adminPage,
});

export const adminResourcesQuerySchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("24h"),
});

export const adminAuditQuerySchema = z.object({
  page: adminPage,
  search: adminSearch,
  action: z.string().trim().max(40).default(""),
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

export const clearTableSchema = z.object({
  mode: z.enum(["truncate", "drop"], "Choose truncate or drop"),
});
