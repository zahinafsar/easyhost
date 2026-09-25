import { existsSync, mkdtempSync, openAsBlob, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as tar from "tar";
import pc from "picocolors";
import ora, { type Ora } from "ora";
import { request, type App, type Deployment, type DeploymentStep } from "../lib/api.js";
import { resolveApp } from "../lib/resolve-app.js";
import { fail, log } from "../lib/ui.js";

const IGNORED_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", ".turbo", ".swc"]);
const IGNORED_FILES = new Set([".DS_Store", ".easyhost.json"]);

const isIgnored = (entry: string) => {
  const parts = entry.replace(/^\.\//, "").split("/");
  if (parts.some((part) => IGNORED_DIRS.has(part))) {
    return true;
  }
  const name = parts[parts.length - 1];
  if (IGNORED_FILES.has(name) || name.endsWith(".tsbuildinfo")) {
    return true;
  }
  return name.startsWith(".env") && name !== ".env.example";
};

const assertNextProject = (cwd: string) => {
  const pkgFile = path.join(cwd, "package.json");
  if (!existsSync(pkgFile)) {
    fail("No package.json found. Run this inside your Next.js project.");
  }

  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  if (!pkg.dependencies?.next && !pkg.devDependencies?.next) {
    fail("This does not look like a Next.js project. Only Next.js apps are supported right now.");
  }
  if (!pkg.scripts?.build) {
    fail("No build script found in package.json.");
  }
};

const packSource = async (cwd: string) => {
  const stage = mkdtempSync(path.join(tmpdir(), "easyhost-"));
  const archive = path.join(stage, "app.tgz");
  await tar.create(
    { gzip: true, cwd, file: archive, portable: true, filter: (entry) => !isIgnored(entry) },
    ["."],
  );
  return { stage, archive };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STEP_LABELS: Record<Exclude<DeploymentStep, "DONE">, { active: string; done: string }> = {
  QUEUED: { active: "Waiting in queue", done: "Waited in queue" },
  PREPARING: { active: "Preparing environment", done: "Prepared environment" },
  INSTALLING: { active: "Installing dependencies", done: "Installed dependencies" },
  BUILDING: { active: "Building app", done: "Built app" },
  STARTING: { active: "Starting app", done: "Started app" },
  ROUTING: { active: "Going live", done: "Routed traffic" },
};

const STEP_ORDER: DeploymentStep[] = ["QUEUED", "PREPARING", "INSTALLING", "BUILDING", "STARTING", "ROUTING", "DONE"];

const NOISE = [/^ ---> /, /^Step \d+\/\d+ : /, /^Removed intermediate/, /^npm (notice|warn)/, /returned a non-zero code/];

const errorTail = (text: string, lines = 25) => {
  return text
    .split("\n")
    .filter((line) => line.trim() && !NOISE.some((pattern) => pattern.test(line)))
    .slice(-lines)
    .join("\n");
};

const seconds = (since: number) => `${Math.round((Date.now() - since) / 1000)}s`;

const withSpinner = async <T>(text: string, done: (result: T) => string, task: () => Promise<T>) => {
  const spinner = ora(text).start();
  const startedAt = Date.now();
  try {
    const result = await task();
    spinner.succeed(`${done(result)} ${pc.dim(seconds(startedAt))}`);
    return result;
  } catch (error) {
    spinner.fail(text);
    throw error;
  }
};

type FollowResult = "live" | "failed" | "superseded";

const queueLabel = (position: number | null | undefined) => {
  if (!position) {
    return STEP_LABELS.QUEUED.active;
  }
  return `${STEP_LABELS.QUEUED.active} (${position} ahead)`;
};

const followDeployment = async (app: App, deploymentId: string, verbose: boolean): Promise<FollowResult> => {
  let printed = 0;
  let step: DeploymentStep | null = null;
  let stepStartedAt = Date.now();
  let spinner: Ora | null = null;

  const finishStep = () => {
    if (spinner && step && step !== "DONE") {
      spinner.succeed(`${STEP_LABELS[step].done} ${pc.dim(seconds(stepStartedAt))}`);
    }
  };

  while (true) {
    const { deployment } = await request<{ deployment: Deployment }>(`/apps/${app.id}/deployments/${deploymentId}`);
    const text = deployment.log ?? "";

    if (verbose && text.length > printed) {
      process.stdout.write(pc.dim(text.slice(printed)));
      printed = text.length;
    }

    if (deployment.status === "SUPERSEDED") {
      if (spinner) {
        spinner.warn("Replaced by a newer deploy");
      }
      return "superseded";
    }

    if (deployment.status === "FAILED") {
      if (spinner && step && step !== "DONE") {
        spinner.fail(STEP_LABELS[step].active);
      }
      if (!verbose) {
        console.log(`\n${pc.dim(errorTail(text))}\n`);
      }
      return "failed";
    }

    if (!verbose && deployment.step !== step) {
      finishStep();
      if (step) {
        const skipped = STEP_ORDER.slice(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.indexOf(deployment.step));
        for (const item of skipped) {
          if (item !== "DONE") {
            ora().succeed(STEP_LABELS[item].done);
          }
        }
      }
      step = deployment.step;
      stepStartedAt = Date.now();
      spinner = null;
      if (step !== "DONE") {
        spinner = ora(STEP_LABELS[step].active).start();
      }
    }

    if (spinner && deployment.status === "QUEUED") {
      spinner.text = queueLabel(deployment.queuePosition);
    }

    if (deployment.status === "RUNNING") {
      finishStep();
      return "live";
    }

    await sleep(1500);
  }
};

const warnMissingEnv = (app: App, cwd: string) => {
  if (!Object.keys(app.env ?? {}).length && existsSync(path.join(cwd, ".env"))) {
    log.warn(".env files are not uploaded. Set variables with `ezhst env set KEY=VALUE` and redeploy.");
  }
};

export const deploy = async (options: { app?: string; verbose?: boolean }) => {
  const cwd = process.cwd();
  assertNextProject(cwd);

  const app = await resolveApp(options.app);
  log.info(`\nDeploying ${pc.bold(app.name)}\n`);

  const { stage, archive } = await withSpinner("Packaging source", () => "Packaged source", () => packSource(cwd));

  try {
    const { deployment, url } = await withSpinner(
      "Uploading",
      (result) => `Uploaded ${result.size}`,
      async () => {
        const blob = await openAsBlob(archive);
        const form = new FormData();
        form.append("file", blob, "app.tgz");
        const result = await request<{ deployment: Deployment; url: string }>(`/apps/${app.id}/deploy`, {
          method: "POST",
          body: form,
        });
        return { ...result, size: `${(blob.size / 1024 / 1024).toFixed(1)} MB` };
      },
    );

    const result = await followDeployment(app, deployment.id, !!options.verbose);
    if (result === "superseded") {
      log.warn("A newer deploy for this app was queued, so this one was skipped.");
      return;
    }
    if (result === "failed") {
      warnMissingEnv(app, cwd);
      fail("Deployment failed. Run with --verbose or open the app in the dashboard for the full log.");
    }
    log.success(`\nLive at ${pc.bold(url)}`);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
};

export const redeploy = async (options: { app?: string; verbose?: boolean }) => {
  const app = await resolveApp(options.app);
  log.info(`\nRedeploying ${pc.bold(app.name)}\n`);

  const { deployment, url } = await withSpinner("Queueing redeploy", () => "Queued redeploy", () =>
    request<{ deployment: Deployment; url: string }>(`/apps/${app.id}/redeploy`, { method: "POST" }),
  );

  const result = await followDeployment(app, deployment.id, !!options.verbose);
  if (result === "superseded") {
    log.warn("A newer deploy for this app was queued, so this one was skipped.");
    return;
  }
  if (result === "failed") {
    fail("Redeploy failed. Run with --verbose or open the app in the dashboard for the full log.");
  }
  log.success(`\nLive at ${pc.bold(url)}`);
};
