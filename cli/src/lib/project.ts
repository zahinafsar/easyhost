import { input, select } from "@inquirer/prompts";
import path from "node:path";
import { json, request, setProjectScope, type App, type AppDetail, type Project } from "./api.js";
import { readLinkedProject, writeLinkedProject } from "./config.js";
import { fail, isInteractive, log } from "./ui.js";

export type ProjectOption = { project?: string; app?: string };

const fetchProject = async (idOrSlug: string) => {
  const { project } = await request<{ project: Project }>(`/projects/${encodeURIComponent(idOrSlug)}`);
  setProjectScope(project.id);
  return project;
};

const chooseProject = async () => {
  const { projects } = await request<{ projects: Project[] }>("/projects");
  let choice = "__new__";
  if (projects.length) {
    choice = await select({ message: "Which project should this folder use?", choices: [{ name: "Create a new project", value: "__new__" }, ...projects.map((project) => ({ name: `${project.name} (${project.slug})`, value: project.id }))] });
  }
  const existing = projects.find((project) => project.id === choice);
  if (existing) {
    setProjectScope(existing.id);
    return existing;
  }
  const name = await input({ message: "Project name", default: path.basename(process.cwd()) });
  const { project } = await request<{ project: Project }>("/projects", json("POST", { name }));
  setProjectScope(project.id);
  log.success(`Created project ${project.name}`);
  return project;
};

export const linkProject = async (slug?: string) => {
  let project: Project;
  if (slug) {
    project = await fetchProject(slug);
  } else if (isInteractive()) {
    project = await chooseProject();
  } else {
    return fail("Missing --project <slug>. List projects with `ezhst projects list`.");
  }
  writeLinkedProject({ projectId: project.id, slug: project.slug });
  log.dim("Saved project link in .reverhost.json");
  return project;
};

export const resolveProject = async (options: ProjectOption) => {
  if (options.project) {
    return fetchProject(options.project);
  }
  const linked = readLinkedProject();
  if (linked) {
    return fetchProject(linked.projectId);
  }
  if (!isInteractive()) {
    return fail("No project linked. Pass --project <slug> or run `ezhst link --project <slug>`.");
  }
  return linkProject();
};

export const resolveApp = async (options: ProjectOption, create = false): Promise<App> => {
  const project = await resolveProject(options);
  const { apps } = await request<{ apps: App[] }>("/apps");
  const linked = readLinkedProject();
  let selected = options.app;
  if (!selected && linked?.projectId === project.id) {
    selected = linked.appId;
  }
  let app = apps.find((item) => item.id === selected || item.slug === selected || item.name === selected);
  if (!app && selected) {
    return fail(`App "${selected}" not found in this project. List apps with \`ezhst apps list\`.`);
  }
  if (!app && !selected && apps.length === 1) {
    app = apps[0];
  }
  if (!app && !selected && apps.length > 1) {
    if (!isInteractive()) {
      return fail("This project has multiple apps. Pass --app <slug>.");
    }
    const id = await select({ message: "Which app?", choices: apps.map((item) => ({ name: `${item.name} (${item.slug})`, value: item.id })) });
    app = apps.find((item) => item.id === id);
  }
  if (!app && create && apps.length === 0) {
    const name = path.basename(process.cwd());
    app = (await request<{ app: App }>("/apps", json("POST", { name }))).app;
  }
  if (!app) {
    return fail("This project has no apps. Create one with `ezhst apps create <name>`.");
  }
  return app;
};

export const resolveAppDetail = async (options: ProjectOption) => {
  const app = await resolveApp(options);
  return request<AppDetail>(`/apps/${app.id}`);
};
