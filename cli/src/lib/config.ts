import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(homedir(), ".easyhost");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const PROJECT_FILE = ".easyhost.json";

const PRODUCTION_API_URL = "https://api.reverhost.com";

type GlobalConfig = { apiUrl: string; token?: string };
type LinkedProject = { projectId: string; slug: string; appId?: string };

export const readConfig = (): GlobalConfig => {
  let config: GlobalConfig = { apiUrl: PRODUCTION_API_URL };
  if (existsSync(CONFIG_FILE)) {
    config = { ...config, ...JSON.parse(readFileSync(CONFIG_FILE, "utf8")) };
  }
  if (process.env.EZHST_TOKEN) {
    config.token = process.env.EZHST_TOKEN;
  }
  return config;
};

export const writeConfig = (config: GlobalConfig) => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
};

export const clearConfig = () => {
  rmSync(CONFIG_FILE, { force: true });
};

export const readLinkedProject = (cwd = process.cwd()): LinkedProject | null => {
  const file = path.join(cwd, PROJECT_FILE);
  if (!existsSync(file)) {
    return null;
  }
  return JSON.parse(readFileSync(file, "utf8"));
};

export const writeLinkedProject = (project: LinkedProject, cwd = process.cwd()) => {
  writeFileSync(path.join(cwd, PROJECT_FILE), `${JSON.stringify(project, null, 2)}\n`);
};
