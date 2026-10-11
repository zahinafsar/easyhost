import { prisma } from "./prisma.js";
import { LIMITS } from "./limits.js";
import { runDeployment } from "./deploy.js";

let active = 0;
let draining = false;

const claimNext = async () => {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE deployments SET status = 'BUILDING'
    WHERE id = (
      SELECT id FROM deployments
      WHERE status = 'QUEUED'
        AND "appId" NOT IN (SELECT "appId" FROM deployments WHERE status = 'BUILDING')
      ORDER BY "createdAt"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `;
  if (!rows.length) {
    return null;
  }
  return rows[0].id;
};

const processQueue = async () => {
  if (draining) {
    return;
  }
  draining = true;

  try {
    while (active < LIMITS.concurrentBuilds) {
      const id = await claimNext();
      if (!id) {
        break;
      }
      active += 1;
      runDeployment(id)
        .catch((error) => console.error("Deployment crashed", error))
        .finally(() => {
          active -= 1;
          processQueue().catch((error) => console.error("Build queue failed", error));
        });
    }
  } finally {
    draining = false;
  }
};

export const enqueueDeployment = async (appId: string, artifactKey: string) => {
  const deployment = await prisma.$transaction(async (tx) => {
    const current = await tx.app.findUnique({ where: { id: appId } });
    if (!current) {
      throw new Error("App not found");
    }
    const projectId = current.parentProjectId ?? current.id;
    await tx.$queryRaw`SELECT id FROM apps WHERE id = ${projectId} FOR UPDATE`;
    const [app, project] = await Promise.all([
      tx.app.findUnique({ where: { id: appId } }),
      tx.app.findUnique({ where: { id: projectId } }),
    ]);
    if (!app || !app.appEnabled || app.deleting || !project || project.deleting) {
      throw new Error("This app or project is being deleted");
    }
    await tx.deployment.updateMany({
      where: { appId, status: "QUEUED" },
      data: { status: "SUPERSEDED", finishedAt: new Date(), log: "Replaced by a newer deploy\n" },
    });
    return tx.deployment.create({
      data: { appId, artifactKey },
      select: { id: true, status: true, step: true, imageTag: true, createdAt: true, finishedAt: true },
    });
  });

  processQueue().catch((error) => console.error("Build queue failed", error));
  return deployment;
};

export const queuePosition = async (deployment: { status: string; createdAt: Date }) => {
  if (deployment.status !== "QUEUED") {
    return null;
  }
  const [queuedAhead, building] = await Promise.all([
    prisma.deployment.count({ where: { status: "QUEUED", createdAt: { lt: deployment.createdAt } } }),
    prisma.deployment.count({ where: { status: "BUILDING" } }),
  ]);
  return queuedAhead + building;
};

const recoverInterruptedBuilds = async () => {
  const interrupted = await prisma.deployment.findMany({
    where: { status: "BUILDING" },
    select: { id: true, appId: true },
  });

  for (const item of interrupted) {
    await prisma.$executeRaw`UPDATE deployments SET status = 'FAILED', "finishedAt" = NOW(), log = log || ${"Deployment failed: interrupted by a server restart\n"} WHERE id = ${item.id}`;
  }

  const appIds = [...new Set(interrupted.map((item) => item.appId))];
  for (const appId of appIds) {
    const running = await prisma.deployment.count({ where: { appId, status: "RUNNING" } });
    let status: "RUNNING" | "FAILED" = "FAILED";
    if (running) {
      status = "RUNNING";
    }
    await prisma.app.update({ where: { id: appId }, data: { status } });
  }

  if (interrupted.length) {
    console.log(`Marked ${interrupted.length} interrupted build(s) as failed`);
  }
};

export const startBuildQueue = async () => {
  await recoverInterruptedBuilds();
  await processQueue();
  setInterval(() => {
    processQueue().catch((error) => console.error("Build queue failed", error));
  }, 5000);
};
