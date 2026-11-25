import type { DeploymentStep } from "@prisma/client";
import { prisma } from "./prisma.js";
import { minio, DEPLOY_BUCKET } from "./minio.js";
import { buildContext, containerName, runContainer, APP_PORT } from "./docker.js";
import { buildCacheRef, imageTag, pullImage, removeAppImage } from "./registry.js";
import { removeSource, sourceObjectName, submitBuild, watchBuild } from "./cloud-build.js";

const readObject = async (key: string) => {
  const stream = await minio.getObject(DEPLOY_BUCKET, key);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
};

const createLogger = (deploymentId: string) => {
  let buffer = "";
  let pending: Promise<unknown> = Promise.resolve();

  const flush = () => {
    const text = buffer;
    buffer = "";
    if (!text) {
      return pending;
    }
    pending = pending.then(() => prisma.$executeRaw`UPDATE deployments SET log = log || ${text} WHERE id = ${deploymentId}`);
    return pending;
  };

  const timer = setInterval(flush, 1000);

  return {
    log: (line: string) => {
      buffer += `${line}\n`;
    },
    close: async () => {
      clearInterval(timer);
      await flush();
    },
  };
};

const isBuildLine = (line: string) => /^#\d+ /.test(line);

export const MISSING_DOCKERFILE_ERROR = "This app has no Dockerfile. Set one in the Build tab or run `ezhst build dockerfile set -f Dockerfile`.";

export const runDeployment = async (deploymentId: string) => {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { app: true },
  });
  if (!deployment) {
    return;
  }

  const { app } = deployment;
  const logger = createLogger(deploymentId);
  const tag = imageTag(app.slug, deployment.id);
  const resumed = Boolean(deployment.cloudBuildId);
  let currentStep: DeploymentStep = deployment.step;
  let stepUpdate: Promise<unknown> = Promise.resolve();
  let cleanupImage = false;

  const setStep = (step: DeploymentStep) => {
    if (step === currentStep) {
      return stepUpdate;
    }
    currentStep = step;
    stepUpdate = stepUpdate.then(() => prisma.deployment.update({ where: { id: deploymentId }, data: { step } }));
    return stepUpdate;
  };

  const onBuildLog = (line: string) => {
    logger.log(line);
    if (isBuildLine(line)) {
      setStep("BUILDING");
    }
  };

  try {
    const appEnv = app.env as Record<string, string>;
    let buildId = deployment.cloudBuildId;

    if (!buildId) {
      if (!app.dockerfile) {
        throw new Error(MISSING_DOCKERFILE_ERROR);
      }
      const artifact = await readObject(deployment.artifactKey);
      const rootDir = app.rootDir ?? "";
      await prisma.deployment.update({ where: { id: deploymentId }, data: { imageTag: tag } });
      await setStep("PREPARING");
      await prisma.app.update({ where: { id: app.id }, data: { status: "DEPLOYING" } });
      logger.log(`Building with the app Dockerfile in /${rootDir}`);
      logger.log("Sending source to the build server");
      const context = await buildContext(artifact, appEnv, app.dockerfile);
      buildId = await submitBuild(deploymentId, context, { tag, rootDir, cacheRef: buildCacheRef(app.slug) });
      await prisma.deployment.update({ where: { id: deploymentId }, data: { cloudBuildId: buildId } });
      logger.log(`Building ${tag}`);
    } else {
      logger.log("Server restarted, resuming the build");
    }

    await watchBuild(buildId, onBuildLog, resumed);
    cleanupImage = true;
    await removeSource(sourceObjectName(deploymentId));

    const latest = await prisma.app.findUniqueOrThrow({ where: { id: app.id }, select: { suspended: true } });
    if (latest.suspended) {
      throw new Error("The app was paused because the project is over its plan limits");
    }

    await setStep("STARTING");
    logger.log("Downloading image");
    await pullImage(tag, (line) => logger.log(line));
    logger.log("Starting container");
    const name = containerName(app.slug);
    const env = { ...appEnv, PORT: String(APP_PORT), HOSTNAME: "0.0.0.0" };
    const containerId = await runContainer(name, tag, env);
    cleanupImage = false;

    const previous = await prisma.deployment.findMany({
      where: { appId: app.id, status: "RUNNING", id: { not: deploymentId } },
    });
    await prisma.deployment.updateMany({
      where: { id: { in: previous.map((item) => item.id) } },
      data: { status: "SUPERSEDED" },
    });
    for (const item of previous) {
      if (item.imageTag) {
        await removeAppImage(item.imageTag);
      }
    }

    logger.log("Deployment is live");
    await logger.close();
    await setStep("DONE");
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: "RUNNING", finishedAt: new Date() } });
    await prisma.app.update({ where: { id: app.id }, data: { status: "RUNNING", containerId } });
  } catch (error) {
    logger.log(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    await logger.close();
    await stepUpdate.catch(() => undefined);
    await removeSource(sourceObjectName(deploymentId));
    if (cleanupImage) {
      await removeAppImage(tag);
    }
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: "FAILED", finishedAt: new Date() } });
    const running = await prisma.deployment.count({ where: { appId: app.id, status: "RUNNING" } });
    await prisma.app.update({ where: { id: app.id }, data: { status: running ? "RUNNING" : "FAILED" } });
  }
};
