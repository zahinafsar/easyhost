import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
const secret = (bytes) => randomBytes(bytes).toString("hex");

const GENERATED = {
  POSTGRES_PASSWORD: () => secret(24),
  MINIO_ROOT_PASSWORD: () => secret(24),
  JWT_SECRET: () => secret(32),
};

const REQUIRED = ["POSTGRES_PASSWORD", "MINIO_ROOT_PASSWORD", "JWT_SECRET", "RESEND_API_KEY", "EMAIL_FROM", "EMAIL_DAILY_LIMIT"];

const readEnv = () => {
  if (!existsSync(envFile)) {
    return readFileSync(path.join(root, ".env.example"), "utf8");
  }
  return readFileSync(envFile, "utf8");
};

const ensureEnv = () => {
  let content = readEnv();
  const created = [];

  for (const [key, generate] of Object.entries(GENERATED)) {
    const pattern = new RegExp(`^${key}=(.*)$`, "m");
    const match = content.match(pattern);
    if (match && match[1].trim()) {
      continue;
    }
    const line = `${key}=${generate()}`;
    if (match) {
      content = content.replace(pattern, line);
    } else {
      content = `${content.trimEnd()}\n${line}\n`;
    }
    created.push(key);
  }

  writeFileSync(envFile, content, { mode: 0o600 });
  if (created.length) {
    console.log(`Generated ${created.join(", ")} in .env`);
  }
  const missing = REQUIRED.filter((key) => !new RegExp(`^${key}=\\S+`, "m").test(content));
  if (missing.length) {
    console.error(`Missing required values in .env: ${missing.join(", ")}`);
    console.error("Fill them in and run npm start again.");
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

ensureEnv();
run(["compose", "-f", "docker-compose.prod.yml", "up", "-d", "--build", "--remove-orphans"]);

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
