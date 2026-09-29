import { hc, type ClientResponse } from "hono/client";
import type { AppType } from "../../../../server/src/index.ts";
import { selectedProjectId } from "@/lib/project";

const projectFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  const projectId = selectedProjectId();
  if (projectId) {
    headers.set("X-Project-ID", projectId);
  }
  return fetch(input, { ...init, headers });
};

export const api = hc<AppType>("/", { fetch: projectFetch }).api;

type SuccessStatus = 200 | 201;

type SuccessBody<T> = T extends ClientResponse<infer Body, infer Status, "json">
  ? Status extends SuccessStatus
    ? Body
    : never
  : never;

export const unwrap = async <T extends ClientResponse<unknown, number, "json">>(request: Promise<T>) => {
  const res = await request;
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Something went wrong");
  }
  return data as SuccessBody<T>;
};

export const upload = async (url: string, form: FormData) => {
  const headers = new Headers();
  const projectId = selectedProjectId();
  if (projectId) {
    headers.set("X-Project-ID", projectId);
  }
  const res = await fetch(url, { method: "POST", body: form, credentials: "include", headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data;
};
