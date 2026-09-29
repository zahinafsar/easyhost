import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");

const checkEnv = () => {
  if (!existsSync(envFile)) {
    console.error("Missing .env. Copy .env.production.example to .env and fill in every value.");
    process.exit(1);
  }

  const lines = readFileSync(envFile, "utf8").split("\n").filter((line) => /^[A-Z_]+=/.test(line));
  const invalid = lines
    .filter((line) => {
      const value = line.slice(line.indexOf("=") + 1).trim();
      return !value || /<[A-Z_]+>/.test(value);
    })
    .map((line) => line.slice(0, line.indexOf("=")));

  if (invalid.length) {
    console.error(`Fill in these values in .env: ${invalid.join(", ")}`);
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
const upArgs = ["compose", "-f", "docker-compose.prod.yml", "--env-file", ".env", "up", "-d", "--build", "--remove-orphans"];
if (process.argv.includes("--force-recreate")) {
  upArgs.push("--force-recreate");
}
run(upArgs);

console.log(`
EasyHost is running.

  Marketing  https://easyhost.fun
  Dashboard  https://app.easyhost.fun
  API        https://api.easyhost.fun
  Storage    https://storage.easyhost.fun
  Apps       https://<app>.easyhost.fun

Logs: npm run logs
Restart: npm run restart
Stop: npm stop
`);
