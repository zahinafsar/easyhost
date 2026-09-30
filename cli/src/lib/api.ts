import { readConfig } from "./config.js";

export type Project = {
  id: string;
  name: string;
  slug: string;
  status: string;
  url: string;
  env: Record<string, string>;
  nodeVersion: string | null;
  rootDir: string | null;
  installCommand: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeploymentStep = "QUEUED" | "PREPARING" | "INSTALLING" | "BUILDING" | "STARTING" | "ROUTING" | "DONE";

export type Deployment = {
  id: string;
  status: "QUEUED" | "BUILDING" | "RUNNING" | "FAILED" | "SUPERSEDED";
  step: DeploymentStep;
  queuePosition?: number | null;
  log?: string;
  createdAt: string;
  finishedAt?: string | null;
};

export type Domain = { id: string; hostname: string; status: string; error: string | null };

export type ProjectDetail = {
  app: Project;
  deployments: Deployment[];
  domains: Domain[];
  dnsTarget: { cname: string; ip: string };
  nodeVersions: string[];
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const request = async <T>(pathname: string, init: RequestInit = {}, projectId?: string) => {
  const { apiUrl, token } = readConfig();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (projectId) {
    headers.set("X-Project-ID", projectId);
  }
  if (init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl}/api${pathname}`, { ...init, headers }).catch(() => {
    throw new ApiError(`Could not reach ${apiUrl}. Log in again with \`ezhst login --api <url>\` to change it.`, 0);
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !pathname.startsWith("/auth/")) {
      throw new ApiError("Not logged in. Run `ezhst login` or set EZHST_TOKEN.", 401);
    }
    throw new ApiError(data.error ?? `Request failed with status ${res.status}`, res.status);
  }
  return data as T;
};

export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
