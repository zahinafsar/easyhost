import pc from "picocolors";
import { json, request, type Project } from "../lib/api.js";
import { linkProject, resolveProject, resolveProjectDetail, type ProjectOption } from "../lib/project.js";
import { confirmed, log, output } from "../lib/ui.js";

export const listProjects = async () => {
  const { apps } = await request<{ apps: Project[] }>("/apps");
  output({ projects: apps }, () => {
    if (!apps.length) {
      log.info("No projects yet. Create one with `ezhst projects create <name>`.");
      return;
    }
    for (const project of apps) {
      log.info(`${pc.bold(project.slug.padEnd(28))} ${project.status.padEnd(10)} ${pc.dim(project.url)}`);
    }
  });
};

export const createProject = async (name: string, options: { link?: boolean }) => {
  const { app } = await request<{ app: Project }>("/apps", json("POST", { name }));
  if (options.link) {
    await linkProject(app.slug);
  }
  output({ project: app }, () => log.success(`Created ${app.name}: ${app.slug} (${app.url})`));
};

export const projectInfo = async (options: ProjectOption) => {
  const detail = await resolveProjectDetail(options);
  const { app, deployments, domains } = detail;
  output(detail, () => {
    log.info(`${pc.bold(app.name)} ${pc.dim(`(${app.slug})`)}`);
    log.info(`Status:  ${app.status}`);
    log.info(`URL:     ${app.url}`);
    log.info(`Env:     ${Object.keys(app.env).length} variables`);
    log.info(`Domains: ${domains.map((domain) => `${domain.hostname} (${domain.status})`).join(", ") || "none"}`);
    const latest = deployments[0];
    if (latest) {
      log.info(`Latest deployment: ${latest.id} ${latest.status} ${latest.createdAt}`);
    }
  });
};

export const renameProject = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { app } = await request<{ app: Project }>(`/apps/${project.id}`, json("PUT", { name }));
  output({ project: app }, () => log.success(`Renamed to ${app.name}. The URL stays ${app.url}`));
};

export const deleteProject = async (options: ProjectOption & { yes?: boolean }) => {
  const project = await resolveProject(options);
  confirmed(options.yes, `Deleting ${project.slug} removes its app, deployments, storage, database, email and API keys.`);
  const result = await request<{ message: string }>(`/apps/${project.id}`, { method: "DELETE" });
  output(result, () => log.success(`Deleted ${project.slug}`));
};

export const link = async (options: ProjectOption) => {
  const project = await linkProject(options.project);
  output({ project }, () => log.success(`Linked to ${project.name} (${project.url})`));
};

export const logs = async (options: ProjectOption & { tail?: string }) => {
  const project = await resolveProject(options);
  const { logs: text } = await request<{ logs: string }>(`/apps/${project.id}/logs?tail=${options.tail ?? "200"}`);
  output({ logs: text }, () => process.stdout.write(text || "No logs yet.\n"));
};

const setRunning = async (options: ProjectOption, action: "start" | "stop") => {
  const project = await resolveProject(options);
  const { app } = await request<{ app: Project }>(`/apps/${project.id}/${action}`, { method: "POST" });
  output({ project: app }, () => log.success(`${app.slug} is ${app.status.toLowerCase()}`));
};

export const start = (options: ProjectOption) => setRunning(options, "start");

export const stop = (options: ProjectOption) => setRunning(options, "stop");
