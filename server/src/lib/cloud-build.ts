import path from "node:path";
import { GoogleAuth } from "google-auth-library";
import { env } from "./env.js";
import { REGISTRY_USER } from "./registry.js";
import { LIMITS } from "./limits.js";
import { SOURCE_DIR } from "./docker.js";

const REGION = "us-central1";
const REGISTRY_SECRET = "registry-password";
const BUILDER_IMAGE = "docker:27.5.1-cli";
const BUILD_TIMEOUT = "1200s";
const POLL_MS = 3000;

const auth = new GoogleAuth({
  credentials: {
    client_email: env.gcp.serviceAccount.clientEmail,
    private_key: env.gcp.serviceAccount.privateKey,
  },
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const buildsUrl = `https://cloudbuild.googleapis.com/v1/projects/${env.gcp.projectId}/locations/${REGION}/builds`;

const request = async (url: string, init: RequestInit = {}) => {
  const token = await auth.getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
};

const expectOk = async (response: Response, action: string) => {
  if (response.ok) {
    return response;
  }
  const text = await response.text();
  throw new Error(`${action} failed (${response.status}): ${text.slice(0, 500)}`);
};

const objectUrl = (name: string) => {
  return `https://storage.googleapis.com/storage/v1/b/${env.gcp.bucket}/o/${encodeURIComponent(name)}`;
};

const uploadSource = async (name: string, body: Buffer) => {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${env.gcp.bucket}/o?uploadType=media&name=${encodeURIComponent(name)}`;
  const response = await request(url, {
    method: "POST",
    headers: { "Content-Type": "application/gzip" },
    body: new Uint8Array(body),
  });
  await expectOk(response, "Uploading build source");
};

export const removeSource = async (name: string) => {
  try {
    await request(objectUrl(name), { method: "DELETE" });
  } catch {
    return;
  }
};

const quote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

const MB = 1024 * 1024;

export type BuildRequest = {
  tag: string;
  rootDir: string;
};

const buildScript = ({ tag, rootDir }: BuildRequest) => {
  const source = quote(path.posix.join(SOURCE_DIR, rootDir));
  const maxMb = Math.floor(LIMITS.maxImageBytes / MB);
  return [
    "set -e",
    `docker buildx build --progress=plain --load --secret id=appenv,src=appenv -f Dockerfile -t ${tag} ${source}`,
    `SIZE=$(docker image inspect -f '{{.Size}}' ${tag})`,
    `echo "Image size: $((SIZE / ${MB})) MB"`,
    `if [ "$SIZE" -gt ${LIMITS.maxImageBytes} ]; then echo "Image is $((SIZE / ${MB})) MB, the limit is ${maxMb} MB. Use a smaller base image or a multi-stage build."; exit 1; fi`,
    `echo "$REGISTRY_PASSWORD" | docker login ${env.registry.host} -u ${REGISTRY_USER} --password-stdin`,
    `docker push ${tag}`,
  ]
    .join("\n")
    .replaceAll("$", "$$$$");
};

export const sourceObjectName = (deploymentId: string) => `sources/${deploymentId}.tgz`;

export const submitBuild = async (deploymentId: string, context: Buffer, build: BuildRequest) => {
  const source = sourceObjectName(deploymentId);
  await uploadSource(source, context);

  const response = await request(buildsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: { storageSource: { bucket: env.gcp.bucket, object: source } },
      steps: [
        {
          name: BUILDER_IMAGE,
          entrypoint: "sh",
          args: ["-c", buildScript(build)],
          secretEnv: ["REGISTRY_PASSWORD"],
        },
      ],
      availableSecrets: {
        secretManager: [
          {
            versionName: `projects/${env.gcp.projectId}/secrets/${REGISTRY_SECRET}/versions/latest`,
            env: "REGISTRY_PASSWORD",
          },
        ],
      },
      serviceAccount: `projects/${env.gcp.projectId}/serviceAccounts/${env.gcp.serviceAccount.clientEmail}`,
      logsBucket: `gs://${env.gcp.bucket}`,
      options: { logging: "GCS_ONLY" },
      timeout: BUILD_TIMEOUT,
      tags: ["easyhost", `deployment-${deploymentId.toLowerCase()}`],
    }),
  });
  await expectOk(response, "Starting Cloud Build");
  const operation = (await response.json()) as { metadata?: { build?: { id?: string } } };
  const buildId = operation.metadata?.build?.id;
  if (!buildId) {
    throw new Error("Cloud Build did not return a build id");
  }
  return buildId;
};

type BuildStatus = {
  status: string;
  statusDetail?: string;
};

const getBuild = async (buildId: string) => {
  const response = await expectOk(await request(`${buildsUrl}/${buildId}`), "Reading Cloud Build status");
  return (await response.json()) as BuildStatus;
};

const logObject = (buildId: string) => `log-${buildId}.txt`;

const readLog = async (buildId: string, offset: number) => {
  const response = await request(`${objectUrl(logObject(buildId))}?alt=media`, {
    headers: { Range: `bytes=${offset}-` },
  });
  if (response.status === 404 || response.status === 416) {
    return "";
  }
  await expectOk(response, "Reading build log");
  return response.text();
};

const logSize = async (buildId: string) => {
  const response = await request(objectUrl(logObject(buildId)));
  if (response.status === 404) {
    return 0;
  }
  await expectOk(response, "Reading build log size");
  const meta = (await response.json()) as { size?: string };
  return Number(meta.size ?? 0);
};

const RUNNING = ["PENDING", "QUEUED", "WORKING"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const watchBuild = async (buildId: string, onLine: (line: string) => void, resumed: boolean) => {
  let offset = 0;
  if (resumed) {
    offset = await logSize(buildId);
  }
  let partial = "";

  const drain = async () => {
    const chunk = await readLog(buildId, offset);
    if (!chunk) {
      return;
    }
    offset += Buffer.byteLength(chunk);
    const lines = (partial + chunk).split("\n");
    partial = lines.pop() ?? "";
    for (const line of lines) {
      onLine(line.replace(/^Step #\d+: /, ""));
    }
  };

  while (true) {
    const build = await getBuild(buildId);
    await drain();
    if (!RUNNING.includes(build.status)) {
      await drain();
      if (partial) {
        onLine(partial.replace(/^Step #\d+: /, ""));
      }
      if (build.status !== "SUCCESS") {
        let message = `Build ${build.status.toLowerCase()}`;
        if (build.statusDetail) {
          message += `: ${build.statusDetail}`;
        }
        throw new Error(message);
      }
      return;
    }
    await sleep(POLL_MS);
  }
};
