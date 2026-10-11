import type { DeploymentStep } from "@prisma/client";
import { prisma } from "./prisma.js";
import { minio, DEPLOY_BUCKET } from "./minio.js";
import { resolveBuildPlan, type BuildPlan } from "./build-plan.js";
import { buildImage, containerName, imageTag, runContainer, removeImage, APP_PORT } from "./docker.js";

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
  if (!line.startsWith("Step ")) {
    return null;
  }
  if (line.endsWith(` : RUN ${plan.build}`)) {
    return "BUILDING";
  }
  if (line.endsWith(` : RUN ${plan.install}`)) {
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
  let currentStep: DeploymentStep = "QUEUED";
  let stepUpdate: Promise<unknown> = Promise.resolve();

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
    await prisma.deployment.update({ where: { id: deploymentId }, data: { imageTag: tag } });
    await setStep("PREPARING");
    await prisma.app.update({ where: { id: app.id }, data: { status: "DEPLOYING" } });

    logger.log("Downloading source");
    const artifact = await readObject(deployment.artifactKey);
    const appEnv = app.env as Record<string, string>;

    const plan = await resolveBuildPlan(artifact, app);
    logger.log(describePlan(plan));

    logger.log(`Installing dependencies and building ${tag}`);
    await buildImage(artifact, tag, plan, appEnv, onBuildLog(plan));

    await setStep("STARTING");
    logger.log("Starting container");
    const name = containerName(app.slug);
    const env = { ...appEnv, PORT: String(APP_PORT), HOSTNAME: "0.0.0.0" };
    const containerId = await runContainer(name, tag, env);

    const previous = await prisma.deployment.findMany({
      where: { appId: app.id, status: "RUNNING", id: { not: deploymentId } },
    });
    await prisma.deployment.updateMany({
      where: { id: { in: previous.map((item) => item.id) } },
      data: { status: "SUPERSEDED" },
    });
    for (const item of previous) {
      if (item.imageTag) {
        await removeImage(item.imageTag);
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
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: "FAILED", finishedAt: new Date() } });
    const running = await prisma.deployment.count({ where: { appId: app.id, status: "RUNNING" } });
    await prisma.app.update({ where: { id: app.id }, data: { status: running ? "RUNNING" : "FAILED" } });
  }
};
