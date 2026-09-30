import { readFileSync } from "node:fs";
import { json, request, type Project } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { fail, log, output } from "../lib/ui.js";

const saveEnv = async (project: Project, env: Record<string, string>) => {
  await request(`/apps/${project.id}/env`, json("PUT", { env }));
  output({ env }, () => log.success("Environment saved. Run `ezhst redeploy` to apply it."));
};

const parseDotenv = (text: string) => {
  const entries: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) {
      continue;
    }
    const index = line.indexOf("=");
    if (index < 1) {
      continue;
    }
    let value = line.slice(index + 1).trim();
    const quoted = value.length > 1 && (value[0] === '"' || value[0] === "'") && value.endsWith(value[0]);
    if (quoted) {
      value = value.slice(1, -1);
    }
    entries[line.slice(0, index).trim()] = value;
  }
  return entries;
};

export const listEnv = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  output({ env: project.env }, () => {
    const entries = Object.entries(project.env);
    if (!entries.length) {
      log.info("No environment variables set.");
      return;
    }
    for (const [key, value] of entries) {
      log.info(`${key}=${value}`);
    }
  });
};

export const setEnv = async (pairs: string[], options: ProjectOption) => {
  const project = await resolveProject(options);
  const env = { ...project.env };
  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index < 1) {
      fail(`Invalid pair "${pair}". Use KEY=VALUE.`);
    }
    env[pair.slice(0, index)] = pair.slice(index + 1);
  }
  await saveEnv(project, env);
};

export const unsetEnv = async (keys: string[], options: ProjectOption) => {
  const project = await resolveProject(options);
  const env = { ...project.env };
  for (const key of keys) {
    delete env[key];
  }
  await saveEnv(project, env);
};

export const importEnv = async (file: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const imported = parseDotenv(readFileSync(file, "utf8"));
  if (!Object.keys(imported).length) {
    fail(`No variables found in ${file}.`);
  }
  await saveEnv(project, { ...project.env, ...imported });
};
