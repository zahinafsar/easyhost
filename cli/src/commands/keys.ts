import pc from "picocolors";
import { json, request } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { log, output } from "../lib/ui.js";

type ApiKey = { id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string };

export const listKeys = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  const { apiKeys } = await request<{ apiKeys: ApiKey[] }>("/api-keys", {}, project.id);
  output({ apiKeys }, () => {
    if (!apiKeys.length) {
      log.info("No API keys yet. Create one with `ezhst keys create <name>`.");
      return;
    }
    for (const key of apiKeys) {
      log.info(`${key.id}  ${pc.bold(key.name.padEnd(24))} ${key.prefix}...  ${pc.dim(`last used ${key.lastUsedAt ?? "never"}`)}`);
    }
  });
};

export const createKey = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const result = await request<{ apiKey: ApiKey; key: string }>("/api-keys", json("POST", { name }), project.id);
  output(result, () => {
    log.success(`Created ${result.apiKey.name}. Copy it now, it is shown only once:`);
    log.info(result.key);
  });
};

export const revokeKey = async (id: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const result = await request<{ message: string }>(`/api-keys/${id}`, { method: "DELETE" }, project.id);
  output(result, () => log.success(result.message));
};
