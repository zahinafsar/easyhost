import pc from "picocolors";
import { json, request, type App, type Project } from "../lib/api.js";
import { linkProject, resolveApp, resolveProject, type ProjectOption } from "../lib/project.js";
import { writeLinkedProject } from "../lib/config.js";
import { confirmed, log, output } from "../lib/ui.js";

export const listProjects = async () => {
  const { projects } = await request<{ projects: Project[] }>("/projects");
  output({ projects }, () => {
    if (!projects.length) {
      log.info("No projects yet. Create one with `ezhst projects create <name>`.");
    }
    for (const project of projects) {
      log.info(`${pc.bold(project.slug.padEnd(40))} ${project.name}`);
    }
  });
};

export const createProject = async (name: string, options: { link?: boolean }) => {
  const { project } = await request<{ project: Project }>("/projects", json("POST", { name }));
  if (options.link) {
    await linkProject(project.slug);
  }
  output({ project }, () => log.success(`Created ${project.name}: ${project.slug}`));
};

export const projectInfo = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  const { apps } = await request<{ apps: App[] }>("/apps");
  output({ project, apps }, () => {
    log.info(`${pc.bold(project.name)} (${project.slug})`);
    for (const app of apps) {
      log.info(`${app.slug} ${app.status} ${app.url}`);
    }
  });
};

export const renameProject = async (name: string, options: ProjectOption) => {
  const current = await resolveProject(options);
  const { project } = await request<{ project: Project }>(`/projects/${current.id}`, json("PUT", { name }));
  output({ project }, () => log.success(`Renamed to ${project.name}`));
};

export const deleteProject = async (options: ProjectOption & { yes?: boolean }) => {
  const project = await resolveProject(options);
  confirmed(options.yes, `Deleting ${project.slug} removes all apps, deployments, schedules, storage, database, email and API keys.`);
  const result = await request<{ message: string }>(`/projects/${project.id}`, { method: "DELETE" });
  output(result, () => log.success(`Deleted ${project.slug}`));
};

export const link = async (options: ProjectOption) => {
  const project = await linkProject(options.project);
  if (options.app) {
    const app = await resolveApp({ project: project.id, app: options.app });
    writeLinkedProject({ projectId: project.id, slug: project.slug, appId: app.id });
    output({ project, app }, () => log.success(`Linked to ${project.name} / ${app.name}`));
  } else {
    output({ project }, () => log.success(`Linked to ${project.name}`));
  }
};

export const logs = async (options: ProjectOption & { tail?: string }) => {
  const app = await resolveApp(options);
  const { logs: text } = await request<{ logs: string }>(`/apps/${app.id}/logs?tail=${options.tail ?? "200"}`);
  output({ logs: text }, () => process.stdout.write(text || "No logs yet.\n"));
};

const setRunning = async (options: ProjectOption, action: "start" | "stop") => {
  const current = await resolveApp(options);
  const { app } = await request<{ app: App }>(`/apps/${current.id}/${action}`, { method: "POST" });
  output({ app }, () => log.success(`${app.slug} is ${app.status.toLowerCase()}`));
};

export const start = (options: ProjectOption) => setRunning(options, "start");
export const stop = (options: ProjectOption) => setRunning(options, "stop");
