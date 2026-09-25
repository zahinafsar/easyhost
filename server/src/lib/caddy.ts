import http from "node:http";
import { env } from "./env.js";

const CADDY_ADMIN_URL = env.caddyAdminUrl;
const SERVER_NAME = "apps";

const routeId = (slug: string) => `app-${slug}`;

export const appHost = (slug: string) => `${slug}.${env.appsDomain}`;

export const appUrl = (slug: string) => `${env.appsProtocol}://${appHost(slug)}`;

const adminTarget = () => {
  if (CADDY_ADMIN_URL.startsWith("unix:")) {
    return { socketPath: CADDY_ADMIN_URL.slice("unix:".length) };
  }
  const url = new URL(CADDY_ADMIN_URL);
  return { hostname: url.hostname, port: Number(url.port || 80) };
};

const adminRequest = (method: string, path: string, body?: unknown) => {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    let payload: string | undefined;
    if (body !== undefined) {
      payload = JSON.stringify(body);
    }
    const headers: Record<string, string> = {};
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = String(Buffer.byteLength(payload));
    }

    const req = http.request({ ...adminTarget(), method, path, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
};

export const hasAppRoute = async (slug: string) => {
  const res = await adminRequest("GET", `/id/${routeId(slug)}`);
  return res.status === 200;
};

export const removeAppRoute = async (slug: string) => {
  const res = await adminRequest("DELETE", `/id/${routeId(slug)}`);
  if (res.status >= 400 && res.status !== 404 && !res.text.includes("unknown object ID")) {
    throw new Error(`Caddy route delete failed: ${res.text}`);
  }
};

export const upsertAppRoute = async (slug: string, upstream: string) => {
  await removeAppRoute(slug).catch(() => undefined);

  const route = {
    "@id": routeId(slug),
    match: [{ host: [appHost(slug)] }],
    handle: [
      {
        handler: "reverse_proxy",
        upstreams: [{ dial: upstream }],
      },
    ],
    terminal: true,
  };

  const res = await adminRequest("POST", `/config/apps/http/servers/${SERVER_NAME}/routes`, route);
  if (res.status >= 400) {
    throw new Error(`Caddy route update failed: ${res.text}`);
  }
};
