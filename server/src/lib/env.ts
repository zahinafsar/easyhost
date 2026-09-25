const REQUIRED = [
  "PORT",
  "DATABASE_URL",
  "JWT_SECRET",
  "APP_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_DAILY_LIMIT",
  "MINIO_ENDPOINT",
  "MINIO_PORT",
  "MINIO_USE_SSL",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_DEPLOY_BUCKET",
  "MINIO_PUBLIC_ENDPOINT",
  "MINIO_PUBLIC_PORT",
  "MINIO_PUBLIC_USE_SSL",
  "SQLITE_DIR",
  "CADDY_ADMIN_URL",
  "APPS_DOMAIN",
  "APPS_PROTOCOL",
  "DOCKER_NETWORK",
  "BUILD_CONCURRENCY",
] as const;

type EnvName = (typeof REQUIRED)[number];

const missing = REQUIRED.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const raw = (name: EnvName) => process.env[name] as string;

const integer = (name: EnvName) => {
  const value = Number(raw(name));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer, got "${raw(name)}"`);
  }
  return value;
};

const boolean = (name: EnvName) => {
  const value = raw(name);
  if (value !== "true" && value !== "false") {
    throw new Error(`Environment variable ${name} must be "true" or "false", got "${value}"`);
  }
  return value === "true";
};

const oneOf = <T extends string>(name: EnvName, options: readonly T[]) => {
  const value = raw(name);
  if (!options.includes(value as T)) {
    throw new Error(`Environment variable ${name} must be one of ${options.join(", ")}, got "${value}"`);
  }
  return value as T;
};

export const env = {
  port: integer("PORT"),
  jwtSecret: raw("JWT_SECRET"),
  appUrl: raw("APP_URL"),
  resendApiKey: raw("RESEND_API_KEY"),
  emailFrom: raw("EMAIL_FROM"),
  emailDailyLimit: integer("EMAIL_DAILY_LIMIT"),
  minio: {
    endpoint: raw("MINIO_ENDPOINT"),
    port: integer("MINIO_PORT"),
    useSSL: boolean("MINIO_USE_SSL"),
    accessKey: raw("MINIO_ACCESS_KEY"),
    secretKey: raw("MINIO_SECRET_KEY"),
    deployBucket: raw("MINIO_DEPLOY_BUCKET"),
    publicEndpoint: raw("MINIO_PUBLIC_ENDPOINT"),
    publicPort: integer("MINIO_PUBLIC_PORT"),
    publicUseSSL: boolean("MINIO_PUBLIC_USE_SSL"),
  },
  sqliteDir: raw("SQLITE_DIR"),
  caddyAdminUrl: raw("CADDY_ADMIN_URL"),
  appsDomain: raw("APPS_DOMAIN"),
  appsProtocol: oneOf("APPS_PROTOCOL", ["http", "https"] as const),
  dockerNetwork: raw("DOCKER_NETWORK"),
  buildConcurrency: integer("BUILD_CONCURRENCY"),
};
