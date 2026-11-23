import type { DeploymentStep } from "@prisma/client";
import { prisma } from "./prisma.js";
import { minio, DEPLOY_BUCKET } from "./minio.js";
import { resolveBuildPlan, type BuildPlan } from "./build-plan.js";
import { buildContext, containerName, runContainer, runWithEnv, APP_PORT } from "./docker.js";
import { imageTag, pullImage, removeAppImage } from "./registry.js";
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

const stepFromBuildLine = (line: string, plan: BuildPlan): DeploymentStep | null => {
  if (!/^#\d+ \[[^\]]+\] RUN /.test(line)) {
    return null;
  }
  const instruction = line.slice(line.indexOf("] ") + 2);
  if (plan.build && instruction === runWithEnv(plan.build)) {
    return "BUILDING";
  }
  if (instruction === runWithEnv(plan.install)) {
    return "INSTALLING";
  }
  return null;
};

const describePlan = (plan: BuildPlan) => {
  return [
    `Node ${plan.nodeVersion}`,
    `Install in /${plan.installDir}: ${plan.install}`,
    `Build in /${plan.appDir}: ${plan.build ?? "No build script; skipped"}`,
    `Start: ${plan.start}`,
  ].join("\n");
};

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

  const onBuildLog = (plan: BuildPlan) => (line: string) => {
    logger.log(line);
    const step = stepFromBuildLine(line, plan);
    if (step) {
      setStep(step);
    }
  };

  try {
    const artifact = await readObject(deployment.artifactKey);
    const appEnv = app.env as Record<string, string>;
    const plan = await resolveBuildPlan(artifact, app);
    let buildId = deployment.cloudBuildId;

    if (!buildId) {
      await prisma.deployment.update({ where: { id: deploymentId }, data: { imageTag: tag } });
      await setStep("PREPARING");
      await prisma.app.update({ where: { id: app.id }, data: { status: "DEPLOYING" } });
      logger.log(describePlan(plan));
      logger.log("Sending source to the build server");
      const context = await buildContext(artifact, plan, appEnv);
      buildId = await submitBuild(deploymentId, context, tag);
      await prisma.deployment.update({ where: { id: deploymentId }, data: { cloudBuildId: buildId } });
      logger.log(`Installing dependencies and building ${tag}`);
    } else {
      logger.log("Server restarted, resuming the build");
    }

    await watchBuild(buildId, onBuildLog(plan), resumed);
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
