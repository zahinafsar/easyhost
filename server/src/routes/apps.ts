import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { DEPLOY_BUCKET, minio } from "../lib/minio.js";
import { containerLogs, containerName, startContainer, stopContainer } from "../lib/docker.js";
import { appHost, appUrl, isPlatformHostname, markDomainFailed, provisionDomain, releaseDomain, resolvesToServer } from "../lib/domains.js";
import { env } from "../lib/env.js";
import { enqueueDeployment, queuePosition } from "../lib/build-queue.js";
import { deleteApp } from "../lib/delete-project.js";
import { findProjectApp, projectAppsWhere, resourceSlug, withAppUrl } from "../lib/project-apps.js";
import { requireProject } from "../middleware/require-project.js";
import { validate } from "../lib/validator.js";
import { addDomainSchema, createAppSchema, logsQuerySchema, updateBuildSchema, updateEnvSchema, updateProjectSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";
import { LIMITS } from "../lib/limits.js";
import { NODE_VERSIONS } from "../lib/build-plan.js";
import { startAiApp } from "../lib/ai-apps.js";

const AI_APP_ERROR = "AI apps are changed from the Builder, not deployed.";

const MAX_ARTIFACT_BYTES = 500 * 1024 * 1024;

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
  .use(requireProject)
  .get("/", async (c) => {
    const apps = await prisma.app.findMany({
      where: projectAppsWhere(c.get("projectId")),
      orderBy: { createdAt: "desc" },
      include: { deployments: { select: deploymentSummary, orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return c.json({ apps: apps.map(withAppUrl), limit: LIMITS.apps });
  })
  .post("/", validate("json", createAppSchema), async (c) => {
    const { name } = c.req.valid("json");

    const projectId = c.get("projectId");
    const app = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM apps WHERE id = ${projectId} FOR UPDATE`;
      const project = await tx.app.findUnique({ where: { id: projectId } });
      if (!project || project.deleting) {
        return null;
      }
      const count = await tx.app.count({ where: { appEnabled: true, OR: [{ id: projectId }, { parentProjectId: projectId }] } });
      if (count >= LIMITS.apps) {
        return null;
      }
      return tx.app.create({ data: { userId: project.userId, parentProjectId: projectId, name, slug: resourceSlug(name) } });
    });
    if (!app) {
      return c.json({ error: `Each project can have at most ${LIMITS.apps} apps.` }, 400);
    }
    return c.json({ app: withAppUrl(app) }, 201);
  })
  .put("/:id", validate("json", updateProjectSchema), async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const updated = await prisma.app.update({ where: { id: app.id }, data: { appName: c.req.valid("json").name } });
    return c.json({ app: withAppUrl(updated) });
  })
  .get("/:id", async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
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
      app: withAppUrl(app),
      deployments,
      domains,
      dnsTarget: { cname: appHost(app.slug), ip: env.publicIp },
      nodeVersions: NODE_VERSIONS,
    });
  })
  .post("/:id/domains", validate("json", addDomainSchema), async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
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
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
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
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
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
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const updated = await prisma.app.update({ where: { id: app.id }, data: { env: c.req.valid("json").env } });
    if (updated.kind === "AI") {
      const restarted = await startAiApp(updated);
      return c.json({ app: withAppUrl(restarted), message: "Environment saved and applied." });
    }
    return c.json({ app: withAppUrl(updated), message: "Environment saved. Redeploy to apply changes." });
  })
  .put("/:id/build", validate("json", updateBuildSchema), async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    if (app.kind === "AI") {
      return c.json({ error: AI_APP_ERROR }, 400);
    }

    const updated = await prisma.app.update({ where: { id: app.id }, data: c.req.valid("json") });
    return c.json({ app: withAppUrl(updated), message: "Build settings saved. Redeploy to apply changes." });
  })
  .post("/:id/deploy", async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    if (app.kind === "AI") {
      return c.json({ error: AI_APP_ERROR }, 400);
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
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    if (app.kind === "AI") {
      return c.json({ error: AI_APP_ERROR }, 400);
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
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
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
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const logs = await containerLogs(containerName(app.slug), c.req.valid("query").tail);
    return c.json({ logs });
  })
  .post("/:id/stop", async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    await stopContainer(containerName(app.slug));
    const updated = await prisma.app.update({ where: { id: app.id }, data: { status: "STOPPED" } });
    return c.json({ app: withAppUrl(updated) });
  })
  .post("/:id/start", async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }
    if (app.kind === "AI") {
      const started = await startAiApp(app);
      return c.json({ app: withAppUrl(started) });
    }
    if (!app.containerId) {
      return c.json({ error: "Deploy the app first" }, 400);
    }

    await startContainer(containerName(app.slug));
    const updated = await prisma.app.update({ where: { id: app.id }, data: { status: "RUNNING" } });
    return c.json({ app: withAppUrl(updated) });
  })
  .delete("/:id", async (c) => {
    const app = await findProjectApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "App not found" }, 404);
    }

    const result = await deleteApp(app);
    if (!result.ok) {
      return c.json({ error: result.error }, 409);
    }
    return c.json({ message: "App deleted" });
  });
