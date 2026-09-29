type NpmConfig = { apiUrl: string; email: string; password: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

const readError = async (res: Response) => {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return data?.error?.message ?? text;
  } catch {
    return text;
  }
};

const token = async (config: NpmConfig) => {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(`${config.apiUrl}/api/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: config.email, secret: config.password }),
  });
  if (!res.ok) {
    throw new Error(`Nginx Proxy Manager login failed: ${await readError(res)}`);
  }
  const data = (await res.json()) as { token?: string; expires?: string };
  if (!data.token || !data.expires) {
    throw new Error("Nginx Proxy Manager login needs a user without two-factor authentication");
  }
  cachedToken = { value: data.token, expiresAt: new Date(data.expires).getTime() };
  return data.token;
};

const request = async <T>(config: NpmConfig, method: string, path: string, body?: unknown) => {
  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${await token(config)}`, "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${config.apiUrl}/api${path}`, init);
  if (res.status === 404 && method === "DELETE") {
    return null;
  }
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  if (res.status === 204) {
    return null;
  }
  return (await res.json()) as T;
};

export const createNpmCertificate = async (config: NpmConfig, hostname: string) => {
  const certificate = await request<{ id: number }>(config, "POST", "/nginx/certificates", {
    provider: "letsencrypt",
    nice_name: hostname,
    domain_names: [hostname],
    meta: { dns_challenge: false },
  });
  if (!certificate) {
    throw new Error("Nginx Proxy Manager returned no certificate");
  }
  return certificate.id;
};

export const createNpmProxyHost = async (
  config: NpmConfig,
  hostname: string,
  certificateId: number,
  upstream: { host: string; port: number },
) => {
  const host = await request<{ id: number }>(config, "POST", "/nginx/proxy-hosts", {
    domain_names: [hostname],
    forward_scheme: "http",
    forward_host: upstream.host,
    forward_port: upstream.port,
    certificate_id: certificateId,
    ssl_forced: true,
    http2_support: true,
    block_exploits: true,
    allow_websocket_upgrade: true,
    caching_enabled: false,
    hsts_enabled: false,
    hsts_subdomains: false,
    access_list_id: 0,
    advanced_config: "client_max_body_size 100m;",
    meta: {},
    locations: [],
  });
  if (!host) {
    throw new Error("Nginx Proxy Manager returned no proxy host");
  }
  return host.id;
};

export const deleteNpmProxyHost = (config: NpmConfig, id: number) => request(config, "DELETE", `/nginx/proxy-hosts/${id}`);

export const deleteNpmCertificate = (config: NpmConfig, id: number) => request(config, "DELETE", `/nginx/certificates/${id}`);
