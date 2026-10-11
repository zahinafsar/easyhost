import Docker from "dockerode";
import { pack } from "tar-stream";
import path from "node:path";
import type { Readable } from "node:stream";
import type { BuildPlan } from "./build-plan.js";

export const docker = new Docker();

const DOCKER_NETWORK = "easyhost";
export const APP_PORT = 3000;

const dockerfile = (plan: BuildPlan, envKeys: string[]) => {
  const args = envKeys.map((key) => `ARG ${key}`).join("\n");
  const installPath = path.posix.join("/app", plan.installDir);
  const appPath = path.posix.join("/app", plan.appDir);
  return `FROM node:${plan.nodeVersion}-alpine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ADD app.tgz /app/
${args}
WORKDIR ${installPath}
RUN ${plan.install}
WORKDIR ${appPath}
ENV PATH=${appPath}/node_modules/.bin:/app/node_modules/.bin:$PATH
${plan.build ? `RUN ${plan.build}` : ""}
ENV NODE_ENV=production PORT=${APP_PORT} HOSTNAME=0.0.0.0
EXPOSE ${APP_PORT}
CMD ["sh", "-c", ${JSON.stringify(plan.start)}]
`;
};

export const containerName = (slug: string) => `eh-app-${slug}`;

export const imageTag = (slug: string, deploymentId: string) => `easyhost/${slug}:${deploymentId.toLowerCase()}`;

const buildContext = (artifact: Buffer, plan: BuildPlan, envKeys: string[]) => {
  const tar = pack();
  tar.entry({ name: "Dockerfile" }, dockerfile(plan, envKeys));
  tar.entry({ name: "app.tgz" }, artifact);
  tar.finalize();
  return tar;
};

export const buildImage = async (
  artifact: Buffer,
  tag: string,
  plan: BuildPlan,
  env: Record<string, string>,
  onLog: (line: string) => void,
) => {
  const stream = await docker.buildImage(buildContext(artifact, plan, Object.keys(env)) as unknown as Readable, {
    t: tag,
    rm: true,
    forcerm: true,
    buildargs: env,
  });

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (error: Error | null, output: { error?: string }[]) => {
        if (error) {
          reject(error);
          return;
        }
        const failed = output.find((item) => item.error);
        if (failed) {
          reject(new Error(failed.error));
          return;
        }
        resolve();
      },
      (event: { stream?: string; error?: string }) => {
        if (event.stream) {
          onLog(event.stream.trimEnd());
        }
        if (event.error) {
          onLog(event.error);
        }
      },
    );
  });
};

const ensureNetwork = async () => {
  const networks = await docker.listNetworks({ filters: { name: [DOCKER_NETWORK] } });
  if (!networks.some((network) => network.Name === DOCKER_NETWORK)) {
    await docker.createNetwork({ Name: DOCKER_NETWORK });
  }
};

export const removeContainer = async (name: string) => {
  const container = docker.getContainer(name);
  try {
    await container.remove({ force: true });
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 404) {
      throw error;
    }
  }
};

export const runContainer = async (name: string, image: string, env: Record<string, string>) => {
  await ensureNetwork();
  await removeContainer(name);

  const container = await docker.createContainer({
    name,
    Image: image,
    Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
    HostConfig: {
      NetworkMode: DOCKER_NETWORK,
      RestartPolicy: { Name: "unless-stopped" },
      Memory: 512 * 1024 * 1024,
      NanoCpus: 1_000_000_000,
    },
    Labels: { "easyhost.app": name },
  });

  await container.start();
  return container.id;
};

export const stopContainer = async (name: string) => {
  try {
    await docker.getContainer(name).stop();
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 304 && statusCode !== 404) {
      throw error;
    }
  }
};

export const startContainer = async (name: string) => {
  try {
    await docker.getContainer(name).start();
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 304) {
      throw error;
    }
  }
};

export const containerLogs = async (name: string, tail = 200) => {
  try {
    const buffer = await docker.getContainer(name).logs({ stdout: true, stderr: true, tail, timestamps: true, follow: false });
    return demuxLogs(buffer as unknown as Buffer);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      return "";
    }
    throw error;
  }
};

const demuxLogs = (buffer: Buffer) => {
  const lines: string[] = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    lines.push(buffer.subarray(offset + 8, offset + 8 + size).toString("utf8"));
    offset += 8 + size;
  }
  if (!lines.length) {
    return buffer.toString("utf8");
  }
  return lines.join("");
};

export const removeImage = async (tag: string) => {
  try {
    await docker.getImage(tag).remove({ force: true });
  } catch {
    return;
  }
};
