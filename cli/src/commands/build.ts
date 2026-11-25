import { existsSync, readFileSync } from "node:fs";
import { select } from "@inquirer/prompts";
import { json, request, type App } from "../lib/api.js";
import { resolveApp, type ProjectOption } from "../lib/project.js";
import { fail, isInteractive, log, output } from "../lib/ui.js";

type Template = { id: string; label: string; content: string };

const settingsOf = (project: App) => ({
  rootDir: project.rootDir,
  dockerfile: project.dockerfile,
});

const printSettings = (project: App) => {
  log.info(`Root directory   ${project.rootDir ?? "project root"}`);
  if (!project.dockerfile) {
    log.info("Dockerfile       not set");
    return;
  }
  log.info("Dockerfile:\n");
  process.stdout.write(`${project.dockerfile}\n`);
};

const saveSettings = async (project: App, settings: { rootDir?: string; dockerfile?: string }) => {
  const { app } = await request<{ app: App }>(`/apps/${project.id}/build`, json("PUT", settings));
  return app;
};

const readStdin = async () => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const readDockerfile = async (file: string) => {
  if (file === "-") {
    return readStdin();
  }
  if (!existsSync(file)) {
    return fail(`${file} not found.`);
  }
  return readFileSync(file, "utf8");
};

const listTemplates = async () => {
  const { templates } = await request<{ templates: Template[] }>("/apps/dockerfile-templates");
  return templates;
};

export const showBuild = async (options: ProjectOption) => {
  const project = await resolveApp(options);
  output({ build: settingsOf(project) }, () => printSettings(project));
};

export const setBuild = async (options: ProjectOption & { rootDir?: string }) => {
  const project = await resolveApp(options);
  if (options.rootDir === undefined) {
    fail("Nothing to change. Pass --root-dir <dir>.");
  }
  const app = await saveSettings(project, { rootDir: options.rootDir });
  output({ build: settingsOf(app) }, () => log.success(`Root directory set to ${app.rootDir ?? "project root"}. Run \`ezhst redeploy\` to apply it.`));
};

export const resetBuild = async (options: ProjectOption) => {
  const project = await resolveApp(options);
  const app = await saveSettings(project, { rootDir: "", dockerfile: "" });
  output({ build: settingsOf(app) }, () => log.success("Build settings cleared. Set a Dockerfile before the next deploy."));
};

export const showDockerfile = async (options: ProjectOption) => {
  const project = await resolveApp(options);
  output({ dockerfile: project.dockerfile }, () => {
    if (!project.dockerfile) {
      log.info("No Dockerfile set. Run `ezhst build dockerfile template` to list templates.");
      return;
    }
    process.stdout.write(`${project.dockerfile}\n`);
  });
};

export const setDockerfile = async (options: ProjectOption & { file: string }) => {
  const project = await resolveApp(options);
  const content = await readDockerfile(options.file);
  const app = await saveSettings(project, { dockerfile: content });
  output({ build: settingsOf(app) }, () => log.success("Dockerfile saved. Run `ezhst deploy` or `ezhst redeploy` to build with it."));
};

export const dockerfileTemplate = async (id: string | undefined, options: ProjectOption & { apply?: boolean }) => {
  const templates = await listTemplates();
  if (!id) {
    output({ templates: templates.map((template) => ({ id: template.id, label: template.label })) }, () => {
      for (const template of templates) {
        log.info(`${template.id.padEnd(8)} ${template.label}`);
      }
    });
    return;
  }
  const template = templates.find((item) => item.id === id);
  if (!template) {
    return fail(`Unknown template ${id}. Available: ${templates.map((item) => item.id).join(", ")}`);
  }
  if (!options.apply) {
    output({ template }, () => process.stdout.write(template.content));
    return;
  }
  const project = await resolveApp(options);
  const app = await saveSettings(project, { dockerfile: template.content });
  output({ build: settingsOf(app) }, () => log.success(`${template.label} Dockerfile saved. Review it with \`ezhst build dockerfile show\`.`));
};

export const ensureDockerfile = async (project: App) => {
  if (project.dockerfile) {
    return project;
  }
  const hint = "This app has no Dockerfile. Write one and run `ezhst build dockerfile set -f Dockerfile`, or start from a template with `ezhst build dockerfile template <id> --apply`.";
  if (!isInteractive()) {
    fail(hint);
  }
  const templates = await listTemplates();
  const choice = await select({
    message: "This app has no Dockerfile. Start from a template?",
    choices: [...templates.map((template) => ({ name: template.label, value: template.id })), { name: "Cancel", value: "" }],
  });
  const template = templates.find((item) => item.id === choice);
  if (!template) {
    return fail(hint);
  }
  const app = await saveSettings(project, { dockerfile: template.content });
  log.success(`${template.label} Dockerfile saved. Edit it later with \`ezhst build dockerfile set -f <file>\`.`);
  return app;
};
