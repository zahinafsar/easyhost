import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { DEPLOY_BUCKET, emptyAndRemoveBucket, minio, removeBucketCredentials } from "../lib/minio.js";
import { containerLogs, containerName, removeContainer, removeImage, startContainer, stopContainer } from "../lib/docker.js";
import { appHost, appUrl, isPlatformHostname, markDomainFailed, provisionDomain, releaseDomain, resolvesToServer } from "../lib/domains.js";
import { env } from "../lib/env.js";
import { enqueueDeployment, queuePosition } from "../lib/build-queue.js";
import { dropUserDatabase } from "../lib/userdb.js";
import { validate } from "../lib/validator.js";
import { addDomainSchema, createAppSchema, isReservedAppName, logsQuerySchema, updateBuildSchema, updateEnvSchema, updateProjectSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";
import { LIMITS } from "../lib/limits.js";
import { NODE_VERSIONS } from "../lib/build-plan.js";

const MAX_ARTIFACT_BYTES = 500 * 1024 * 1024;

const projectSlug = (name: string) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  if (!slug || isReservedAppName(slug)) {
    return `project-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  }
  return slug;
};

const findApp = (userId: string, idOrSlug: string) => {
  return prisma.app.findFirst({
    where: { userId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
};

const withUrl = <T extends { slug: string }>(app: T) => ({ ...app, url: appUrl(app.slug) });

const deploymentSummary = {
  id: true,
  status: true,
  step: true,
  imageTag: true,
  createdAt: true,
  finishedAt: true,
};

export const appRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const apps = await prisma.app.findMany({
      where: { userId: c.get("user").id },
      orderBy: { createdAt: "desc" },
      include: { deployments: { select: deploymentSummary, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return c.json({ apps: apps.map(withUrl), limit: LIMITS.apps });
  })
  .post("/", validate("json", createAppSchema), async (c) => {
    const { name } = c.req.valid("json");

    const count = await prisma.app.count({ where: { userId: c.get("user").id } });
    if (count >= LIMITS.apps) {
      return c.json({ error: `You can have at most ${LIMITS.apps} projects. Delete one to create another.` }, 400);
    }

    let slug = projectSlug(name);
    const existing = await prisma.app.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug.slice(0, 31)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    }

    const app = await prisma.app.create({ data: { userId: c.get("user").id, name, slug } });
    return c.json({ app: withUrl(app) }, 201);
  })
  .put("/:id", validate("json", updateProjectSchema), async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "Project not found" }, 404);
    }

    const updated = await prisma.app.update({ where: { id: app.id }, data: { name: c.req.valid("json").name } });
    return c.json({ app: withUrl(updated) });
  })
  .get("/:id", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const deployments = await prisma.deployment.findMany({
      where: { appId: app.id },
      select: deploymentSummary,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const domains = await prisma.appDomain.findMany({ where: { appId: app.id }, orderBy: { createdAt: "asc" } });
    return c.json({
      app: withUrl(app),
      deployments,
      domains,
      dnsTarget: { cname: appHost(app.slug), ip: env.publicIp },
      nodeVersions: NODE_VERSIONS,
    });
  })
  .post("/:id/domains", validate("json", addDomainSchema), async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const { hostname } = c.req.valid("json");
    if (isPlatformHostname(hostname)) {
      return c.json({ error: `${hostname} is an EasyHost domain and can't be added` }, 400);
    }
    const existing = await prisma.appDomain.findUnique({ where: { hostname } });
    if (existing) {
      return c.json({ error: `${hostname} is already connected to an app` }, 400);
    }

    const domain = await prisma.appDomain.create({ data: { appId: app.id, hostname } });
    return c.json({ domain }, 201);
  })
  .post("/:id/domains/:domainId/verify", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    const domain = await prisma.appDomain.findFirst({ where: { id: c.req.param("domainId"), appId: app.id } });
    if (!domain) {
      return c.json({ error: "Domain not found" }, 404);
    }
    if (domain.status === "ACTIVE") {
      return c.json({ domain });
    }

    const dns = await resolvesToServer(domain.hostname);
    if (!dns.ok) {
      let found = "no address";
      if (dns.ips.length) {
        found = dns.ips.join(", ");
      }
      const error = `${domain.hostname} resolves to ${found}, expected ${env.publicIp}. DNS changes can take a few minutes.`;
      await markDomainFailed(domain.id, error);
      return c.json({ error }, 400);
    }

    try {
      const ids = await provisionDomain(domain, app.slug);
      const updated = await prisma.appDomain.update({
        where: { id: domain.id },
        data: { ...ids, status: "ACTIVE", error: null },
      });
      return c.json({ domain: updated });
    } catch (error) {
      let message = "Could not set up HTTPS for this domain";
      if (error instanceof Error) {
        message = `Could not set up HTTPS: ${error.message}`;
      }
      await markDomainFailed(domain.id, message);
      return c.json({ error: message }, 400);
    }
  })
  .delete("/:id/domains/:domainId", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    const domain = await prisma.appDomain.findFirst({ where: { id: c.req.param("domainId"), appId: app.id } });
    if (!domain) {
      return c.json({ error: "Domain not found" }, 404);
    }

    await releaseDomain(domain);
    await prisma.appDomain.delete({ where: { id: domain.id } });
    return c.json({ message: "Domain removed" });
  })
  .put("/:id/env", validate("json", updateEnvSchema), async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const updated = await prisma.app.update({ where: { id: app.id }, data: { env: c.req.valid("json").env } });
    return c.json({ app: withUrl(updated), message: "Environment saved. Redeploy to apply changes." });
  })
  .put("/:id/build", validate("json", updateBuildSchema), async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const updated = await prisma.app.update({ where: { id: app.id }, data: c.req.valid("json") });
    return c.json({ app: withUrl(updated), message: "Build settings saved. Redeploy to apply changes." });
  })
  .post("/:id/deploy", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      return c.json({ error: "Build artifact is required" }, 400);
    }
    if (file.size > MAX_ARTIFACT_BYTES) {
      return c.json({ error: "Build artifact is larger than 500 MB" }, 400);
    }

    const artifactKey = `${app.id}/${Date.now()}.tgz`;
    await minio.putObject(DEPLOY_BUCKET, artifactKey, Buffer.from(await file.arrayBuffer()), file.size, {
      "Content-Type": "application/gzip",
    });

    const deployment = await enqueueDeployment(app.id, artifactKey);
    return c.json({ deployment, url: appUrl(app.slug) }, 201);
  })
  .post("/:id/redeploy", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const latest = await prisma.deployment.findFirst({
      where: { appId: app.id, status: { in: ["RUNNING", "SUPERSEDED"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) {
      return c.json({ error: "No successful deployment to redeploy" }, 400);
    }

    const deployment = await enqueueDeployment(app.id, latest.artifactKey);
    return c.json({ deployment, url: appUrl(app.slug) }, 201);
  })
  .get("/:id/deployments/:deploymentId", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const deployment = await prisma.deployment.findFirst({
      where: { id: c.req.param("deploymentId"), appId: app.id },
    });
    if (!deployment) {
      return c.json({ error: "Deployment not found" }, 404);
    }
    return c.json({ deployment: { ...deployment, queuePosition: await queuePosition(deployment) } });
  })
  .get("/:id/logs", validate("query", logsQuerySchema), async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const logs = await containerLogs(containerName(app.slug), c.req.valid("query").tail);
    return c.json({ logs });
  })
  .post("/:id/stop", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    await stopContainer(containerName(app.slug));
    const updated = await prisma.app.update({ where: { id: app.id }, data: { status: "STOPPED" } });
    return c.json({ app: withUrl(updated) });
  })
  .post("/:id/start", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    if (!app.containerId) {
      return c.json({ error: "Deploy the app first" }, 400);
    }

    await startContainer(containerName(app.slug));
    const updated = await prisma.app.update({ where: { id: app.id }, data: { status: "RUNNING" } });
    return c.json({ app: withUrl(updated) });
  })
  .delete("/:id", async (c) => {
    const app = await findApp(c.get("user").id, c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

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
    return c.json({ message: "Project deleted" });
  });
