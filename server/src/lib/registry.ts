import { PassThrough } from "node:stream";
import { env } from "./env.js";
import { docker, removeImage } from "./docker.js";
import { prisma } from "./prisma.js";

export const REGISTRY_USER = "easyhost";
const REGISTRY_REPO_PREFIX = "apps";
const GC_INTERVAL_MS = 6 * 60 * 60 * 1000;
const GC_TIMEOUT_MS = 10 * 60 * 1000;

const MANIFEST_TYPES = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

export const APP_IMAGE_PREFIX = `${env.registry.host}/${REGISTRY_REPO_PREFIX}/`;

export const imageTag = (slug: string, deploymentId: string) => `${APP_IMAGE_PREFIX}${slug}:${deploymentId.toLowerCase()}`;

const authHeader = () => {
  return `Basic ${Buffer.from(`${REGISTRY_USER}:${env.registry.password}`).toString("base64")}`;
};

const parseTag = (tag: string) => {
  if (!tag.startsWith(APP_IMAGE_PREFIX)) {
    return null;
  }
  const rest = tag.slice(env.registry.host.length + 1);
  const index = rest.lastIndexOf(":");
  if (index === -1) {
    return null;
  }
  return { repository: rest.slice(0, index), reference: rest.slice(index + 1) };
};

const removeFromRegistry = async (tag: string) => {
  const parsed = parseTag(tag);
  if (!parsed) {
    return;
  }
  const manifestUrl = (reference: string) => `${env.registry.url}/v2/${parsed.repository}/manifests/${reference}`;
  try {
    const head = await fetch(manifestUrl(parsed.reference), {
      method: "HEAD",
      headers: { Authorization: authHeader(), Accept: MANIFEST_TYPES },
    });
    const digest = head.headers.get("docker-content-digest");
    if (!head.ok || !digest) {
      return;
    }
    await fetch(manifestUrl(digest), { method: "DELETE", headers: { Authorization: authHeader() } });
  } catch (error) {
    console.error(`Failed to remove ${tag} from the registry`, error);
  }
};

export const removeAppImage = async (tag: string) => {
  await removeImage(tag);
  await removeFromRegistry(tag);
};

export const pullImage = async (tag: string, onLog: (line: string) => void) => {
  const stream = await docker.pull(tag, {
    authconfig: { username: REGISTRY_USER, password: env.registry.password, serveraddress: env.registry.host },
  });
  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (error: Error | null) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
      (event: { status?: string; id?: string; error?: string }) => {
        if (event.error) {
          onLog(event.error);
        }
      },
    );
  });
  onLog("Image downloaded");
};

const findRegistryContainer = async () => {
  const containers = await docker.listContainers({
    filters: { label: ["com.docker.compose.project=easyhost", "com.docker.compose.service=registry"] },
  });
  if (!containers.length) {
    return null;
  }
  return containers[0].Id;
};

const execGc = async (containerId: string) => {
  const exec = await docker.getContainer(containerId).exec({
    Cmd: ["registry", "garbage-collect", "/etc/docker/registry/config.yml", "--delete-untagged"],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  const sink = new PassThrough();
  sink.resume();
  docker.modem.demuxStream(stream, sink, sink);
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([
    new Promise<void>((resolve) => {
      stream.on("end", () => resolve());
      stream.on("close", () => resolve());
    }),
    new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        stream.destroy();
        resolve();
      }, GC_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);
};

const collectGarbage = async () => {
  const building = await prisma.deployment.count({ where: { status: "BUILDING" } });
  if (building) {
    return;
  }
  const containerId = await findRegistryContainer();
  if (!containerId) {
    return;
  }
  await execGc(containerId);
};

export const startRegistryGc = () => {
  if (!env.isProduction) {
    return;
  }
  setInterval(() => {
    collectGarbage().catch((error) => console.error("Registry garbage collection failed", error));
  }, GC_INTERVAL_MS);
};
