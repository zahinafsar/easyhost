import { closeSync, existsSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
const envExampleFile = path.join(root, ".env.production.example");
const compose = ["compose", "-f", "docker-compose.prod.yml", "--env-file", ".env"];

const parseEnv = (file) => {
  const values = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator > 0) {
      values.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
    }
  }
  return values;
};

const validateEnv = () => {
  if (!existsSync(envFile)) {
    throw new Error("Missing .env. Copy .env.production.example to .env and fill in every value.");
  }
  const expected = parseEnv(envExampleFile);
  const actual = parseEnv(envFile);
  const invalid = [...expected.keys()].filter((name) => {
    const value = actual.get(name);
    return !value || /<[A-Z_]+>/.test(value);
  });
  if (invalid.length) {
    throw new Error(`Missing or incomplete production environment variables: ${invalid.join(", ")}`);
  }
};

const execute = (args, options = {}) => {
  const capture = options.capture === true;
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) {
    throw new Error(`Docker could not run: ${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    const detail = capture && result.stderr?.trim() ? `: ${result.stderr.trim()}` : "";
    throw new Error(`Docker command failed with exit code ${result.status ?? 1}${detail}`);
  }
  return {
    ok: result.status === 0,
    stdout: capture ? result.stdout.trim() : "",
  };
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitForPostgres = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = execute([...compose, "exec", "-T", "postgres", "pg_isready", "-U", "easyhost"], { capture: true, allowFailure: true });
    if (result.ok) {
      return;
    }
    await wait(1000);
  }
  throw new Error("PostgreSQL did not become ready within 60 seconds.");
};

const query = (sql) => execute(
  [...compose, "exec", "-T", "postgres", "psql", "-U", "easyhost", "-d", "easyhost", "-At", "-c", sql],
  { capture: true },
).stdout;

const ensureNoActiveBuilds = () => {
  if (query("SELECT to_regclass('public.deployments') IS NOT NULL;") !== "t") {
    return;
  }
  const active = Number(query("SELECT COUNT(*) FROM deployments WHERE status IN ('QUEUED', 'BUILDING');"));
  if (active > 0) {
    throw new Error(`${active} deployment build(s) are queued or running. Wait for them to finish, then run this script again.`);
  }
};

const backupDatabase = () => {
  const backupDirectory = path.join(root, "backups");
  mkdirSync(backupDirectory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace("T", "_").replace("Z", "");
  const backupPath = path.join(backupDirectory, `easyhost-${timestamp}.sql`);
  const output = openSync(backupPath, "wx", 0o600);
  const result = spawnSync(
    "docker",
    [...compose, "exec", "-T", "postgres", "pg_dumpall", "-U", "easyhost"],
    { cwd: root, stdio: ["ignore", output, "inherit"] },
  );
  closeSync(output);
  if (result.error || result.status !== 0 || statSync(backupPath).size === 0) {
    unlinkSync(backupPath);
    throw new Error(result.error ? `Database backup failed: ${result.error.message}` : "Database backup failed.");
  }
  return backupPath;
};

const waitForApi = async () => {
  const healthCheck = "fetch('http://127.0.0.1:48710/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))";
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const result = execute([...compose, "exec", "-T", "api", "node", "-e", healthCheck], { capture: true, allowFailure: true });
    if (result.ok) {
      return;
    }
    await wait(1000);
  }
  execute([...compose, "logs", "--tail", "100", "api"], { allowFailure: true });
  throw new Error("The API did not become healthy within 90 seconds. Its latest logs are shown above.");
};

const deploy = async () => {
  validateEnv();
  execute(["version"]);

  console.log("Starting production dependencies...");
  execute([...compose, "up", "-d", "postgres", "minio", "minio-init"]);
  await waitForPostgres();

  const previousApiContainer = execute([...compose, "ps", "--status", "running", "-q", "api"], { capture: true }).stdout;
  const previousApiImage = previousApiContainer
    ? execute(["inspect", "--format", "{{.Image}}", previousApiContainer], { capture: true }).stdout
    : "";
  const previousApiImageName = previousApiContainer
    ? execute(["inspect", "--format", "{{.Config.Image}}", previousApiContainer], { capture: true }).stdout
    : "";

  console.log("Building the new API and dashboard image...");
  execute([...compose, "build", "api"]);

  ensureNoActiveBuilds();

  console.log("Backing up PostgreSQL...");
  const backupPath = backupDatabase();
  console.log(`Database backup saved to ${path.relative(root, backupPath)}`);

  ensureNoActiveBuilds();

  const apiWasRunning = previousApiContainer.length > 0;
  if (apiWasRunning) {
    console.log("Stopping the API briefly...");
    execute([...compose, "stop", "api"]);
  }

  console.log("Applying database migrations...");
  const migration = execute(
    [...compose, "run", "--rm", "--no-deps", "api", "npx", "prisma", "migrate", "deploy"],
    { allowFailure: true },
  );
  if (!migration.ok) {
    if (apiWasRunning) {
      console.log("Migration failed. Restarting the previous API container...");
      execute([...compose, "start", "api"], { allowFailure: true });
    }
    throw new Error("Database migration failed. Production was not upgraded.");
  }

  console.log("Starting the updated API...");
  execute([...compose, "up", "-d", "--no-deps", "--force-recreate", "api"]);
  try {
    await waitForApi();
  } catch (error) {
    if (!previousApiImage || !previousApiImageName) {
      throw error;
    }
    console.log("The updated API failed its health check. Restoring the previous API image...");
    execute(["image", "tag", previousApiImage, previousApiImageName]);
    execute([...compose, "up", "-d", "--no-deps", "--force-recreate", "api"]);
    await waitForApi();
    throw new Error("The updated API failed its health check. The previous API version was restored.");
  }
  execute([...compose, "ps"]);

  console.log(`
EasyHost is up to date.

  Marketing  https://easyhost.fun
  Dashboard  https://app.easyhost.fun
  API        https://api.easyhost.fun
  Storage    https://storage.easyhost.fun
  Apps       https://<app>.easyhost.fun

Backup: ${path.relative(root, backupPath)}
Logs:   npm run logs
`);
};

deploy().catch((error) => {
  console.error(`\nDeployment stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
