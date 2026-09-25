import pc from "picocolors";
import { request, type App } from "../lib/api.js";
import { linkApp, resolveApp } from "../lib/resolve-app.js";
import { log } from "../lib/ui.js";

export const listApps = async () => {
  const { apps } = await request<{ apps: App[] }>("/apps");
  if (!apps.length) {
    log.info("No apps yet. Run `ezhst deploy` inside a Next.js project.");
    return;
  }
  for (const app of apps) {
    log.info(`${pc.bold(app.name.padEnd(24))} ${app.status.padEnd(10)} ${pc.dim(app.url)}`);
  }
};

export const init = async () => {
  const app = await linkApp();
  log.success(`Linked to ${app.name}`);
};

export const logs = async (options: { app?: string; tail?: string }) => {
  const app = await resolveApp(options.app);
  const { logs: output } = await request<{ logs: string }>(`/apps/${app.id}/logs?tail=${options.tail ?? "200"}`);
  process.stdout.write(output || "No logs yet.\n");
};

export const listEnv = async (options: { app?: string }) => {
  const app = await resolveApp(options.app);
  const entries = Object.entries(app.env ?? {});
  if (!entries.length) {
    log.info("No environment variables set.");
    return;
  }
  for (const [key, value] of entries) {
    log.info(`${key}=${value}`);
  }
};

const saveEnv = async (app: App, env: Record<string, string>) => {
  await request(`/apps/${app.id}/env`, { method: "PUT", body: JSON.stringify({ env }) });
  log.success("Environment saved. Run `ezhst redeploy` to apply it.");
};

export const setEnv = async (pairs: string[], options: { app?: string }) => {
  const app = await resolveApp(options.app);
  const env = { ...(app.env ?? {}) };
  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index < 1) {
      log.error(`Invalid pair "${pair}". Use KEY=VALUE.`);
      process.exit(1);
    }
    env[pair.slice(0, index)] = pair.slice(index + 1);
  }
  await saveEnv(app, env);
};

export const unsetEnv = async (keys: string[], options: { app?: string }) => {
  const app = await resolveApp(options.app);
  const env = { ...(app.env ?? {}) };
  for (const key of keys) {
    delete env[key];
  }
  await saveEnv(app, env);
};
