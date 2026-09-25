import { input, select } from "@inquirer/prompts";
import path from "node:path";
import { request, type App } from "./api.js";
import { readProject, writeProject } from "./config.js";
import { log } from "./ui.js";

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export const linkApp = async () => {
  const { apps } = await request<{ apps: App[] }>("/apps");
  const NEW_APP = "__new__";

  let choice = NEW_APP;
  if (apps.length) {
    choice = await select({
      message: "Which app should this folder deploy to?",
      choices: [
        { name: "Create a new app", value: NEW_APP },
        ...apps.map((app) => ({ name: `${app.name} (${app.url})`, value: app.id })),
      ],
    });
  }

  let app = apps.find((item) => item.id === choice);
  if (!app) {
    const name = await input({
      message: "App name (used as subdomain)",
      default: slugify(path.basename(process.cwd())),
      validate: (value) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) || "Use lowercase letters, numbers and single dashes",
    });
    const result = await request<{ app: App }>("/apps", { method: "POST", body: JSON.stringify({ name }) });
    app = result.app;
    log.success(`Created app ${app.name}`);
  }

  writeProject({ appId: app.id, slug: app.slug });
  log.dim("Saved link in .easyhost.json");
  return app;
};

export const resolveApp = async (slug?: string) => {
  if (slug) {
    const { app } = await request<{ app: App }>(`/apps/${slug}`);
    return app;
  }

  const project = readProject();
  if (project) {
    const { app } = await request<{ app: App }>(`/apps/${project.appId}`);
    return app;
  }

  return linkApp();
};
