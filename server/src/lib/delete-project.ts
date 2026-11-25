import type { App } from "@prisma/client";
import { prisma } from "./prisma.js";
import { DEPLOY_BUCKET, emptyAndRemoveBucket, minio, removeBucketCredentials } from "./minio.js";
import { containerName, removeContainer } from "./docker.js";
import { removeAppImage, removeBuildCache } from "./registry.js";
import { releaseDomain } from "./domains.js";
import { dropUserDatabase } from "./userdb.js";
import { removeAllAiFiles } from "./ai-apps.js";

type DeleteResult = { ok: true } | { ok: false; error: string };

const removeAppResources = async (app: Pick<App, "id" | "slug">) => {
  const [deployments, domains] = await Promise.all([
    prisma.deployment.findMany({ where: { appId: app.id } }),
    prisma.appDomain.findMany({ where: { appId: app.id } }),
  ]);
  for (const domain of domains) {
    await releaseDomain(domain);
  }
  await removeContainer(containerName(app.slug));
  for (const deployment of deployments) {
    if (deployment.imageTag) {
      await removeAppImage(deployment.imageTag);
    }
  }
  await removeBuildCache(app.slug);
  await removeAllAiFiles(app.id);
  const artifactKeys = [...new Set(deployments.map((deployment) => deployment.artifactKey))];
  if (artifactKeys.length) {
    await minio.removeObjects(DEPLOY_BUCKET, artifactKeys);
  }
};

export const deleteApp = async (app: Pick<App, "id" | "slug" | "parentProjectId">): Promise<DeleteResult> => {
  const projectId = app.parentProjectId ?? app.id;
  const ready = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM apps WHERE id = ${projectId} FOR UPDATE`;
    const project = await tx.app.findUnique({ where: { id: projectId } });
    const current = await tx.app.findUnique({ where: { id: app.id } });
    if (!project || project.deleting || !current || current.deleting) {
      return false;
    }
    const pending = await tx.deployment.count({ where: { appId: app.id, status: { in: ["QUEUED", "BUILDING"] } } });
    if (pending) {
      return false;
    }
    await tx.app.update({ where: { id: app.id }, data: { deleting: true } });
    return true;
  });
  if (!ready) {
    return { ok: false, error: "Wait for pending deployments or deletion to finish before deleting this app." };
  }
  try {
    await removeAppResources(app);
    if (app.parentProjectId) {
      await prisma.app.delete({ where: { id: app.id } });
    } else {
      await prisma.$transaction([
        prisma.deployment.deleteMany({ where: { appId: app.id } }),
        prisma.appDomain.deleteMany({ where: { appId: app.id } }),
        prisma.app.update({
          where: { id: app.id },
          data: { appEnabled: false, deleting: false, status: "IDLE", containerId: null, appName: null, env: {}, rootDir: null, dockerfile: null },
        }),
      ]);
    }
    return { ok: true };
  } catch (error) {
    await prisma.app.updateMany({ where: { id: app.id }, data: { deleting: false } });
    throw error;
  }
};

export const deleteUserAccount = async (userId: string): Promise<DeleteResult> => {
  const projects = await prisma.app.findMany({ where: { userId, parentProjectId: null }, select: { id: true, slug: true } });
  for (const project of projects) {
    const result = await deleteProject(project);
    if (!result.ok) {
      return result;
    }
  }
  const apps = await prisma.app.findMany({ where: { userId }, select: { id: true, slug: true, parentProjectId: true } });
  for (const app of apps) {
    const result = await deleteApp(app);
    if (!result.ok) {
      return result;
    }
    await prisma.app.deleteMany({ where: { id: app.id } });
  }
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
};

export const deleteProject = async (project: Pick<App, "id" | "slug">): Promise<DeleteResult> => {
  const apps = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM apps WHERE id = ${project.id} FOR UPDATE`;
    const rows = await tx.app.findMany({ where: { OR: [{ id: project.id }, { parentProjectId: project.id }] } });
    if (!rows.length || rows.some((app) => app.deleting)) {
      return null;
    }
    const pending = await tx.deployment.count({ where: { appId: { in: rows.map((app) => app.id) }, status: { in: ["QUEUED", "BUILDING"] } } });
    if (pending) {
      return null;
    }
    await tx.app.updateMany({ where: { id: { in: rows.map((app) => app.id) } }, data: { deleting: true } });
    return rows;
  });
  if (!apps) {
    return { ok: false, error: "Wait for pending deployments or deletion to finish before deleting this project." };
  }
  try {
    const [bucket, database] = await Promise.all([
      prisma.bucket.findUnique({ where: { projectId: project.id } }),
      prisma.database.findUnique({ where: { projectId: project.id } }),
    ]);
    for (const app of apps) {
      await removeAppResources(app);
    }
    if (bucket) {
      await removeBucketCredentials(bucket.accessKey);
      await emptyAndRemoveBucket(bucket.minioName);
    }
    if (database) {
      await dropUserDatabase(database);
    }
    await prisma.app.delete({ where: { id: project.id } });
    return { ok: true };
  } catch (error) {
    await prisma.app.updateMany({ where: { id: { in: apps.map((app) => app.id) } }, data: { deleting: false } });
    throw error;
  }
};
