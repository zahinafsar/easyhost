import { readConfig } from "./config.js";

export type App = {
  id: string;
  name: string;
  slug: string;
  status: string;
  url: string;
  env: Record<string, string>;
};

export type DeploymentStep = "QUEUED" | "PREPARING" | "INSTALLING" | "BUILDING" | "STARTING" | "ROUTING" | "DONE";

export type Deployment = {
  id: string;
  status: "QUEUED" | "BUILDING" | "RUNNING" | "FAILED" | "SUPERSEDED";
  step: DeploymentStep;
  queuePosition?: number | null;
  log?: string;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const request = async <T>(pathname: string, init: RequestInit = {}) => {
  const { apiUrl, token } = readConfig();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl}/api${pathname}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError("Not logged in. Run `ezhst login` first.", 401);
    }
    throw new ApiError(data.error ?? `Request failed with status ${res.status}`, res.status);
  }
  return data as T;
};
