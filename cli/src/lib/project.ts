import { input, select } from "@inquirer/prompts";
import path from "node:path";
import { request, type Project, type ProjectDetail } from "./api.js";
import { readLinkedProject, writeLinkedProject } from "./config.js";
import { fail, isInteractive, log } from "./ui.js";

export type ProjectOption = { project?: string };

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export const fetchProject = (idOrSlug: string) => request<ProjectDetail>(`/apps/${idOrSlug}`);

const chooseProject = async () => {
  const { apps } = await request<{ apps: Project[] }>("/apps");
  const NEW_PROJECT = "__new__";

  let choice = NEW_PROJECT;
  if (apps.length) {
    choice = await select({
      message: "Which project should this folder use?",
      choices: [
        { name: "Create a new project", value: NEW_PROJECT },
        ...apps.map((project) => ({ name: `${project.name} (${project.url})`, value: project.id })),
      ],
    });
  }

  const existing = apps.find((project) => project.id === choice);
  if (existing) {
    return existing;
  }

  const name = await input({ message: "Project name (used as subdomain)", default: slugify(path.basename(process.cwd())) });
  const { app } = await request<{ app: Project }>("/apps", { method: "POST", body: JSON.stringify({ name }) });
  log.success(`Created project ${app.name} (${app.url})`);
  return app;
};

export const linkProject = async (slug?: string) => {
  let project: Project;
  if (slug) {
    project = (await fetchProject(slug)).app;
  } else if (isInteractive()) {
    project = await chooseProject();
  } else {
    return fail("Missing --project <slug>. List projects with `ezhst projects list`.");
  }
  writeLinkedProject({ projectId: project.id, slug: project.slug });
  log.dim("Saved link in .easyhost.json");
  return project;
};

export const resolveProjectDetail = async (options: ProjectOption) => {
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
  const project = await linkProject();
  return fetchProject(project.id);
};

export const resolveProject = async (options: ProjectOption) => {
  return (await resolveProjectDetail(options)).app;
};
