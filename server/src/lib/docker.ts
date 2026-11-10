import Docker from "dockerode";
import { pack } from "tar-stream";
import path from "node:path";
import { PassThrough, type Readable } from "node:stream";
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
ENV NODE_ENV=production PORT=${APP_PORT} HOST=0.0.0.0 HOSTNAME=0.0.0.0
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

export const AI_RUNTIME_IMAGE = "easyhost/ai-runtime";
const AI_APP_DIR = "/srv/app";
const NPM_CACHE_VOLUME = "easyhost-npm-cache";

export type ContainerFile = { path: string; content: string | Buffer };

const tarBuffer = async (files: ContainerFile[]) => {
  const tar = pack();
  for (const file of files) {
    tar.entry({ name: file.path }, file.content);
  }
  tar.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of tar) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
};

export const runAiContainer = async (
  name: string,
  env: Record<string, string>,
  files: ContainerFile[],
  options: { publishPort: boolean },
) => {
  await ensureNetwork();
  await removeContainer(name);

  const portKey = `${APP_PORT}/tcp`;
  const hostConfig: Docker.HostConfig = {
    NetworkMode: DOCKER_NETWORK,
    RestartPolicy: { Name: "unless-stopped" },
    Memory: 512 * 1024 * 1024,
    NanoCpus: 1_000_000_000,
    Binds: [`${NPM_CACHE_VOLUME}:/root/.npm`],
  };
  let exposedPorts: Record<string, object> | undefined;
  if (options.publishPort) {
    hostConfig.PortBindings = { [portKey]: [{ HostIp: "127.0.0.1", HostPort: "" }] };
    hostConfig.ExtraHosts = ["host.docker.internal:host-gateway"];
    exposedPorts = { [portKey]: {} };
  }

  const container = await docker.createContainer({
    name,
    Image: AI_RUNTIME_IMAGE,
    Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
    ExposedPorts: exposedPorts,
    HostConfig: hostConfig,
    Labels: { "easyhost.app": name },
  });

  if (files.length) {
    await container.putArchive(await tarBuffer(files), { path: AI_APP_DIR });
  }
  await container.start();
  return container.id;
};

export const putContainerFiles = async (name: string, files: ContainerFile[]) => {
  await docker.getContainer(name).putArchive(await tarBuffer(files), { path: AI_APP_DIR });
};

export const removeContainerFiles = async (name: string, paths: string[]) => {
  const exec = await docker.getContainer(name).exec({
    Cmd: ["rm", "-f", ...paths.map((item) => path.posix.join(AI_APP_DIR, item))],
    AttachStdout: false,
    AttachStderr: false,
  });
  await exec.start({ Detach: true });
};

export const execInContainer = async (name: string, cmd: string[], timeoutMs: number) => {
  const container = docker.getContainer(name);
  const exec = await container.exec({ Cmd: cmd, WorkingDir: AI_APP_DIR, AttachStdout: true, AttachStderr: true });
  const stream = await exec.start({ hijack: true, stdin: false });
  const chunks: Buffer[] = [];
  const collector = new PassThrough();
  collector.on("data", (chunk: Buffer) => chunks.push(chunk));
  docker.modem.demuxStream(stream, collector, collector);

  let timer: NodeJS.Timeout | undefined;
  const finished = new Promise<void>((resolve) => {
    stream.on("end", () => resolve());
    stream.on("close", () => resolve());
  });
  const timedOut = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  const outcome = await Promise.race([finished, timedOut]);
  clearTimeout(timer);
  const output = Buffer.concat(chunks).toString("utf8");
  if (outcome === "timeout") {
    stream.destroy();
    return { exitCode: null, output: `${output}\nTimed out after ${Math.round(timeoutMs / 1000)}s` };
  }
  const { ExitCode } = await exec.inspect();
  return { exitCode: ExitCode, output };
};

export const restartContainer = async (name: string) => {
  await docker.getContainer(name).restart();
};

export const publishedPort = async (name: string) => {
  try {
    const info = await docker.getContainer(name).inspect();
    const binding = info.NetworkSettings.Ports?.[`${APP_PORT}/tcp`]?.[0];
    if (!binding?.HostPort) {
      return null;
    }
    return Number(binding.HostPort);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      return null;
    }
    throw error;
  }
};

export const containerExists = async (name: string) => {
  try {
    await docker.getContainer(name).inspect();
    return true;
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) {
      return false;
    }
    throw error;
  }
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
