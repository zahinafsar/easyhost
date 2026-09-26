const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "APP_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "MINIO_URL",
  "MINIO_ROOT_PASSWORD",
  "STORAGE_PUBLIC_URL",
  "USERDB_URL",
  "USERDB_PUBLIC_HOST",
  "USERDB_PUBLIC_PORT",
  "USERDB_PUBLIC_SSLMODE",
  "CADDY_ADMIN_URL",
  "APPS_DOMAIN",
  "APPS_PROTOCOL",
  "PUBLIC_IP",
  "EDGE_PROXY",
] as const;

const NPM_REQUIRED = ["NPM_API_URL", "NPM_API_EMAIL", "NPM_API_PASSWORD"] as const;

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

const url = (name: EnvName) => {
  try {
    return new URL(raw(name));
  } catch {
    throw new Error(`Environment variable ${name} must be a URL, got "${raw(name)}"`);
  }
};

const oneOf = <T extends string>(name: EnvName, options: readonly T[]) => {
  const value = raw(name);
  if (!options.includes(value as T)) {
    throw new Error(`Environment variable ${name} must be one of ${options.join(", ")}, got "${value}"`);
  }
  return value as T;
};

const readNpm = (edgeProxy: "npm" | "none") => {
  if (edgeProxy === "none") {
    return null;
  }
  const missingNpm = NPM_REQUIRED.filter((name) => !process.env[name]?.trim());
  if (missingNpm.length) {
    throw new Error(`EDGE_PROXY=npm requires: ${missingNpm.join(", ")}`);
  }
  return {
    apiUrl: process.env.NPM_API_URL as string,
    email: process.env.NPM_API_EMAIL as string,
    password: process.env.NPM_API_PASSWORD as string,
  };
};

export const env = {
  jwtSecret: raw("JWT_SECRET"),
  appUrl: raw("APP_URL"),
  resendApiKey: raw("RESEND_API_KEY"),
  emailFrom: raw("EMAIL_FROM"),
  minio: {
    url: url("MINIO_URL"),
    password: raw("MINIO_ROOT_PASSWORD"),
    publicUrl: url("STORAGE_PUBLIC_URL").origin,
  },
  userdb: {
    url: raw("USERDB_URL"),
    publicHost: raw("USERDB_PUBLIC_HOST"),
    publicPort: integer("USERDB_PUBLIC_PORT"),
    publicSslMode: oneOf("USERDB_PUBLIC_SSLMODE", ["no-verify", "require", "verify-full"] as const),
  },
  caddyAdminUrl: raw("CADDY_ADMIN_URL"),
  appsDomain: raw("APPS_DOMAIN"),
  appsProtocol: oneOf("APPS_PROTOCOL", ["http", "https"] as const),
  publicIp: raw("PUBLIC_IP"),
  npm: readNpm(oneOf("EDGE_PROXY", ["npm", "none"] as const)),
};
