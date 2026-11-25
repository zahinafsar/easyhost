import { readConfig } from "./config.js";

export type App = {
  projectId: string;
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

export type Project = {
  id: string;
  name: string;
  slug: string;
  role?: "owner" | "member";
  createdAt: string;
  updatedAt: string;
};


let activeProjectId: string | undefined;
export const setProjectScope = (projectId: string) => { activeProjectId = projectId; };

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

export type AppDetail = {
  app: App;
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
  const scope = projectId ?? activeProjectId;
  if (scope) {
    headers.set("X-Project-ID", scope);
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
    if (data.code === "EMAIL_NOT_VERIFIED") {
      throw new ApiError(
        "Your email is not verified. Run `ezhst verify <code>` with the 6-digit code from your inbox, or `ezhst resend-verification` to get a new code.",
        res.status,
      );
    }
    if (typeof data.error === "string") {
      throw new ApiError(data.error, res.status);
    }
    if (res.status >= 500) {
      throw new ApiError(`Reverhost is having trouble right now (status ${res.status}). Try again in a minute.`, res.status);
    }
    throw new ApiError(`Request failed with status ${res.status}.`, res.status);
  }
  return data as T;
};

export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
