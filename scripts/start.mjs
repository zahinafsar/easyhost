import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.production");

const REQUIRED = [
  "POSTGRES_PASSWORD",
  "MINIO_ROOT_PASSWORD",
  "JWT_SECRET",
  "RESEND_API_KEY",
  "PORT",
  "DATABASE_URL",
  "APP_URL",
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
  "VITE_PUBLIC_API_URL",
  "PROXY_NETWORK",
];

const checkEnv = () => {
  if (!existsSync(envFile)) {
    console.error("Missing .env.production. Copy .env.production.example to .env.production and fill in every value.");
    process.exit(1);
  }

  const content = readFileSync(envFile, "utf8");
  const missing = REQUIRED.filter((key) => !new RegExp(`^${key}=\\S+`, "m").test(content));
  if (missing.length) {
    console.error(`Missing required values in .env.production: ${missing.join(", ")}`);
    process.exit(1);
  }

  const placeholders = REQUIRED.filter((key) => new RegExp(`^${key}=.*<[A-Z_]+>`, "m").test(content));
  if (placeholders.length) {
    console.error(`Replace the <PLACEHOLDER> values in .env.production: ${placeholders.join(", ")}`);
    process.exit(1);
  }
};

const run = (args) => {
  const result = spawnSync("docker", args, { cwd: root, stdio: "inherit" });
  if (result.error) {
    console.error("Docker is not available. Install Docker and try again.");
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

checkEnv();
run(["compose", "-f", "docker-compose.prod.yml", "--env-file", ".env.production", "up", "-d", "--build", "--remove-orphans"]);

console.log(`
EasyHost is running.

  Marketing  https://easyhost.fun
  Dashboard  https://app.easyhost.fun
  API        https://api.easyhost.fun
  Storage    https://storage.easyhost.fun
  Apps       https://<app>.easyhost.fun

Logs: npm run logs
Stop: npm stop
`);
