import type { App } from "@prisma/client";
import { prisma } from "./prisma.js";
import { DEPLOY_BUCKET, emptyAndRemoveBucket, minio, removeBucketCredentials } from "./minio.js";
import { containerName, removeContainer, removeImage } from "./docker.js";
import { releaseDomain } from "./domains.js";
import { dropUserDatabase } from "./userdb.js";

export const deleteProject = async (app: Pick<App, "id" | "slug">) => {
  const [deployments, domains, bucket, database] = await Promise.all([
    prisma.deployment.findMany({ where: { appId: app.id } }),
    prisma.appDomain.findMany({ where: { appId: app.id } }),
    prisma.bucket.findUnique({ where: { projectId: app.id } }),
    prisma.database.findUnique({ where: { projectId: app.id } }),
  ]);
  for (const domain of domains) {
    await releaseDomain(domain);
  }
  await removeContainer(containerName(app.slug));
  for (const deployment of deployments) {
    if (deployment.imageTag) {
      await removeImage(deployment.imageTag);
    }
  }
  const artifactKeys = [...new Set(deployments.map((deployment) => deployment.artifactKey))];
  if (artifactKeys.length) {
    await minio.removeObjects(DEPLOY_BUCKET, artifactKeys);
  }
  if (bucket) {
    await removeBucketCredentials(bucket.accessKey);
    await emptyAndRemoveBucket(bucket.minioName);
  }
  if (database) {
    await dropUserDatabase(database);
  }

  await prisma.app.delete({ where: { id: app.id } });
};
