import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(homedir(), ".easyhost");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const PROJECT_FILE = ".easyhost.json";

export const PRODUCTION_API_URL = "https://api.easyhost.fun";

type GlobalConfig = { apiUrl: string; token?: string };
type ProjectConfig = { appId: string; slug: string };

export const readConfig = (): GlobalConfig => {
  if (!existsSync(CONFIG_FILE)) {
    return { apiUrl: PRODUCTION_API_URL };
  }
  return { apiUrl: PRODUCTION_API_URL, ...JSON.parse(readFileSync(CONFIG_FILE, "utf8")) };
};

export const writeConfig = (config: GlobalConfig) => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
};

export const clearConfig = () => {
  rmSync(CONFIG_FILE, { force: true });
};

export const readProject = (cwd = process.cwd()): ProjectConfig | null => {
  const file = path.join(cwd, PROJECT_FILE);
  if (!existsSync(file)) {
    return null;
  }
  return JSON.parse(readFileSync(file, "utf8"));
};

export const writeProject = (project: ProjectConfig, cwd = process.cwd()) => {
  writeFileSync(path.join(cwd, PROJECT_FILE), `${JSON.stringify(project, null, 2)}\n`);
};
