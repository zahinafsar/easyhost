import { json, request, type App } from "../lib/api.js";
import { resolveApp, type ProjectOption } from "../lib/project.js";
import { log, output } from "../lib/ui.js";

type BuildOptions = ProjectOption & {
  node?: string;
  rootDir?: string;
  install?: string;
  build?: string;
  start?: string;
};

const settingsOf = (project: App) => ({
  nodeVersion: project.nodeVersion,
  rootDir: project.rootDir,
  installCommand: project.installCommand,
  buildCommand: project.buildCommand,
  startCommand: project.startCommand,
});

const printSettings = (project: App) => {
  const rows: [string, string | null][] = [
    ["Node.js version", project.nodeVersion],
    ["Root directory", project.rootDir],
    ["Install command", project.installCommand],
    ["Build command", project.buildCommand],
    ["Start command", project.startCommand],
  ];
  for (const [label, value] of rows) {
    log.info(`${label.padEnd(17)} ${value ?? "auto"}`);
  }
};

const pick = (value: string | undefined, current: string | null) => {
  if (value === undefined) {
    return current ?? "";
  }
  return value;
};

const saveSettings = async (project: App, settings: Record<string, string | null>) => {
  const { app } = await request<{ app: App }>(`/apps/${project.id}/build`, json("PUT", settings));
  output({ build: settingsOf(app) }, () => {
    printSettings(app);
    log.success("Build settings saved. Run `ezhst redeploy` to apply them.");
  });
};

export const showBuild = async (options: ProjectOption) => {
  const project = await resolveApp(options);
  output({ build: settingsOf(project) }, () => printSettings(project));
};

export const setBuild = async (options: BuildOptions) => {
  const project = await resolveApp(options);
  let nodeVersion: string | null = pick(options.node, project.nodeVersion);
  if (!nodeVersion) {
    nodeVersion = null;
  }
  await saveSettings(project, {
    nodeVersion,
    rootDir: pick(options.rootDir, project.rootDir),
    installCommand: pick(options.install, project.installCommand),
    buildCommand: pick(options.build, project.buildCommand),
    startCommand: pick(options.start, project.startCommand),
  });
};

export const resetBuild = async (options: ProjectOption) => {
  const project = await resolveApp(options);
  await saveSettings(project, { nodeVersion: null, rootDir: "", installCommand: "", buildCommand: "", startCommand: "" });
};
