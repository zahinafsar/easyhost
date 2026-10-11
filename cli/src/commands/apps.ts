import { json, request, type App } from "../lib/api.js";
import { resolveApp, resolveProject, type ProjectOption } from "../lib/project.js";
import { confirmed, log, output } from "../lib/ui.js";

export const listApps = async (options: ProjectOption) => {
  await resolveProject(options);
  const result = await request<{ apps: App[]; limit: number }>("/apps");
  output(result, () => {
    log.info(`${result.apps.length}/${result.limit} apps`);
    for (const app of result.apps) {
      log.info(`${app.slug.padEnd(40)} ${app.status.padEnd(10)} ${app.url}`);
    }
  });
};

export const createApp = async (name: string, options: ProjectOption) => {
  await resolveProject(options);
  const { app } = await request<{ app: App }>("/apps", json("POST", { name }));
  output({ app }, () => log.success(`Created ${app.name}: ${app.slug} (${app.url})`));
};

export const deleteApp = async (options: ProjectOption & { yes?: boolean }) => {
  const app = await resolveApp(options);
  confirmed(options.yes, `Deleting ${app.slug} removes this app, its deployments and domains.`);
  const result = await request<{ message: string }>(`/apps/${app.id}`, { method: "DELETE" });
  output(result, () => log.success(`Deleted ${app.slug}`));
};
