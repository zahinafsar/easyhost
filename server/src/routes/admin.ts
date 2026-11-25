import { Hono } from "hono";
import { statfs } from "node:fs/promises";
import os from "node:os";
import type { Prisma, Subscription } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createToken, setAuthCookie } from "../lib/auth.js";
import { docker, containerName, stopContainer } from "../lib/docker.js";
import { bucketSize, minio } from "../lib/minio.js";
import { databaseSizes, userdbStats } from "../lib/userdb.js";
import { deleteProject, deleteUserAccount } from "../lib/delete-project.js";
import { cleanJunk, scanJunk } from "../lib/cleanup.js";
import { appHost, appUrl } from "../lib/domains.js";
import { sendAccountDeletedEmail, sendProjectDeletedEmail } from "../lib/email.js";
import { LIMITS } from "../lib/limits.js";
import { FREE, PRO } from "../lib/plans.js";
import { isSubscriptionActive } from "../lib/billing.js";
import { emailDomain } from "../lib/email-domains.js";
import { containerUsage } from "../lib/metrics.js";
import { AUDIT_ACTIONS, audit } from "../lib/audit.js";
import { validate } from "../lib/validator.js";
import { adminAuditQuerySchema, adminProjectsQuerySchema, adminUsersQuerySchema } from "../lib/validations.js";
import { requireAdmin } from "../middleware/require-admin.js";
import type { UserEnv } from "../lib/types.js";

const PAGE_SIZE = 25;
const AUDIT_PAGE_SIZE = 50;
const IMPERSONATION_TTL = "2h";
const LIVE_SAMPLE_MS = 15 * 60 * 1000;
const HISTORY_MS = 7 * 24 * 60 * 60 * 1000;

const pages = (total: number, size: number) => Math.max(1, Math.ceil(total / size));

const activeSubscriptionWhere = (): Prisma.SubscriptionWhereInput => ({
  OR: [{ status: "ACTIVE" }, { status: "CANCELLED", endsAt: { gt: new Date() } }],
});

const findManageableUser = async (adminId: string, id: string) => {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return { error: "User not found", status: 404 as const };
  }
  if (target.id === adminId) {
    return { error: "You cannot do this to your own account", status: 400 as const };
  }
  if (target.role === "ADMIN") {
    return { error: "Admin accounts cannot be changed here", status: 400 as const };
  }
  return { target };
};

const closeAccount = async (target: { id: string; email: string; name: string }) => {
  const result = await deleteUserAccount(target.id);
  if (!result.ok) {
    return result;
  }
  let emailSent = true;
  try {
    await sendAccountDeletedEmail(target.email, target.name);
  } catch (error) {
    console.error("Failed to send account deleted email", error);
    emailSent = false;
  }
  return { ok: true as const, emailSent };
};

type Check = { name: string; ok: boolean; ms: number; detail: string };

const check = async (name: string, run: () => Promise<string>): Promise<Check> => {
  const started = Date.now();
  try {
    const detail = await run();
    return { name, ok: true, ms: Date.now() - started, detail };
  } catch (error) {
    let detail = "Check failed";
    if (error instanceof Error) {
      detail = error.message;
    }
    return { name, ok: false, ms: Date.now() - started, detail };
  }
};

const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

const planOf = (subscription: Pick<Subscription, "status" | "endsAt"> | null) => {
  if (isSubscriptionActive(subscription)) {
    return PRO;
  }
  return FREE;
};

const usersWhere = (search: string, plan: string, state: string) => {
  const conditions: Prisma.UserWhereInput[] = [];
  if (search) {
    conditions.push({ OR: [{ email: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] });
  }
  if (plan === "pro") {
    conditions.push({ subscription: { is: activeSubscriptionWhere() } });
  }
  if (plan === "free") {
    conditions.push({ NOT: { subscription: { is: activeSubscriptionWhere() } } });
  }
  if (state === "verified") {
    conditions.push({ verified: true });
  }
  if (state === "unverified") {
    conditions.push({ verified: false });
  }
  if (state === "blocked") {
    conditions.push({ blocked: true });
  }
  if (state === "admin") {
    conditions.push({ role: "ADMIN" });
  }
  return { AND: conditions } satisfies Prisma.UserWhereInput;
};

const usersOrder = (sort: string): Prisma.UserOrderByWithRelationInput => {
  if (sort === "oldest") {
    return { createdAt: "asc" };
  }
  if (sort === "active") {
    return { lastActiveAt: { sort: "desc", nulls: "last" } };
  }
  if (sort === "projects") {
    return { apps: { _count: "desc" } };
  }
  return { createdAt: "desc" };
};

const projectsWhere = (search: string, state: string) => {
  const conditions: Prisma.AppWhereInput[] = [{ parentProjectId: null }];
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { projectApps: { some: { slug: { contains: search, mode: "insensitive" } } } },
      ],
    });
  }
  const running: Prisma.AppWhereInput = { OR: [{ appEnabled: true, status: "RUNNING" }, { projectApps: { some: { status: "RUNNING" } } }] };
  if (state === "running") {
    conditions.push(running);
  }
  if (state === "stopped") {
    conditions.push({ NOT: running });
  }
  if (state === "suspended") {
    conditions.push({ OR: [{ suspended: true }, { projectApps: { some: { suspended: true } } }] });
  }
  return { AND: conditions } satisfies Prisma.AppWhereInput;
};

const projectsOrder = (sort: string): Prisma.AppOrderByWithRelationInput => {
  if (sort === "oldest") {
    return { createdAt: "asc" };
  }
  if (sort === "updated") {
    return { updatedAt: "desc" };
  }
  if (sort === "name") {
    return { name: "asc" };
  }
  return { createdAt: "desc" };
};

const latestUsage = async (appIds: string[]) => {
  const samples = await prisma.appMetricSample.findMany({
    where: { appId: { in: appIds }, createdAt: { gte: new Date(Date.now() - LIVE_SAMPLE_MS) } },
    orderBy: { createdAt: "desc" },
    select: { appId: true, memoryBytes: true, cpuPercent: true },
  });
  const latest = new Map<string, { memoryBytes: number; cpuPercent: number }>();
  for (const sample of samples) {
    if (!latest.has(sample.appId)) {
      latest.set(sample.appId, { memoryBytes: Number(sample.memoryBytes), cpuPercent: sample.cpuPercent });
    }
  }
  return latest;
};

type ProjectRow = {
  id: string;
  appEnabled: boolean;
  status: string;
  suspended: boolean;
  projectApps: { id: string; status: string; suspended: boolean }[];
};

const projectApps = <T extends ProjectRow>(project: T) => {
  const apps: { id: string; status: string; suspended: boolean }[] = [...project.projectApps];
  if (project.appEnabled) {
    apps.unshift({ id: project.id, status: project.status, suspended: project.suspended });
  }
  return apps;
};

const projectDatabaseBytes = async (database: { dbName: string } | null) => {
  if (!database) {
    return null;
  }
  try {
    const sizes = await databaseSizes([database.dbName]);
    return sizes.get(database.dbName) ?? 0;
  } catch {
    return null;
  }
};

const projectStorageBytes = async (bucket: { minioName: string } | null) => {
  if (!bucket) {
    return null;
  }
  try {
    return await bucketSize(bucket.minioName);
  } catch {
    return null;
  }
};

const projectHistory = async (appIds: string[]) => {
  if (!appIds.length) {
    return [];
  }
  const since = new Date(Date.now() - HISTORY_MS);
  return prisma.$queryRaw<{ t: Date; memoryBytes: number; cpuPercent: number }[]>`
    SELECT bucket AS t, sum(memory)::float8 AS "memoryBytes", sum(cpu)::float8 AS "cpuPercent"
    FROM (
      SELECT date_trunc('hour', "createdAt") AS bucket, "appId", avg("memoryBytes") AS memory, avg("cpuPercent") AS cpu
      FROM app_metric_samples
      WHERE "appId" = ANY(${appIds}) AND "createdAt" >= ${since}
      GROUP BY 1, 2
    ) per_app
    GROUP BY bucket
    ORDER BY bucket
  `;
};

const withBytes = <T extends object>(resource: T | null, bytes: number | null) => {
  if (!resource) {
    return null;
  }
  return { ...resource, bytes };
};

export const adminRoutes = new Hono<UserEnv>()
  .use(requireAdmin)
  .get("/health", async (c) => {
    const checks = await Promise.all([
      check("Platform database", async () => {
        await prisma.$queryRaw`SELECT 1`;
        return "Postgres is answering queries";
      }),
      check("Customer databases", async () => {
        const stats = await userdbStats();
        return `${stats.databases} databases, ${stats.connections} open connections`;
      }),
      check("Object storage", async () => {
        const buckets = await minio.listBuckets();
        return `${buckets.length} buckets`;
      }),
      check("Docker", async () => {
        const info = await docker.info();
        return `${info.ContainersRunning} of ${info.Containers} containers running`;
      }),
      check("Metrics worker", async () => {
        const latest = await prisma.metricSample.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });
        if (!latest) {
          throw new Error("No samples recorded yet");
        }
        const minutes = Math.round((Date.now() - latest.createdAt.getTime()) / 60000);
        if (minutes > 15) {
          throw new Error(`Last sample ${minutes} minutes ago`);
        }
        return `Last sample ${minutes} minutes ago`;
      }),
    ]);

    const [queued, building, oldestQueued, failedLastDay, apps, disk] = await Promise.all([
      prisma.deployment.count({ where: { status: "QUEUED" } }),
      prisma.deployment.count({ where: { status: "BUILDING" } }),
      prisma.deployment.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.deployment.count({ where: { status: "FAILED", createdAt: { gte: dayAgo() } } }),
      prisma.app.groupBy({ by: ["status"], where: { appEnabled: true }, _count: { _all: true } }),
      statfs("/"),
    ]);

    let oldestQueuedAt: Date | null = null;
    if (oldestQueued) {
      oldestQueuedAt = oldestQueued.createdAt;
    }

    return c.json({
      checks,
      host: {
        cpus: os.cpus().length,
        load: os.loadavg(),
        memoryTotal: os.totalmem(),
        memoryFree: os.freemem(),
        diskTotal: disk.blocks * disk.bsize,
        diskFree: disk.bavail * disk.bsize,
        uptimeSeconds: Math.round(os.uptime()),
        apiUptimeSeconds: Math.round(process.uptime()),
      },
      builds: { queued, building, concurrency: LIMITS.concurrentBuilds, oldestQueuedAt, failedLastDay },
      apps: apps.map((row) => ({ status: row.status, count: row._count._all })),
    });
  })
  .get("/users", validate("query", adminUsersQuerySchema), async (c) => {
    const { page, search, plan, state, sort } = c.req.valid("query");
    const where = usersWhere(search, plan, state);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [usersOrder(sort), { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          blocked: true,
          createdAt: true,
          lastActiveAt: true,
          tokenBalance: true,
          apps: { select: { id: true, status: true, parentProjectId: true, appEnabled: true } },
          subscription: { select: { status: true, endsAt: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return c.json({
      users: users.map(({ apps, subscription, ...user }) => {
        const userPlan = planOf(subscription);
        return {
          ...user,
          plan: userPlan.name,
          projectLimit: userPlan.projects,
          projects: apps.filter((app) => app.parentProjectId === null).length,
          runningApps: apps.filter((app) => app.appEnabled && app.status === "RUNNING").length,
        };
      }),
      total,
      page,
      pages: pages(total, PAGE_SIZE),
    });
  })
  .get("/users/:id", async (c) => {
    const id = c.req.param("id");
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verified: true,
        blocked: true,
        createdAt: true,
        updatedAt: true,
        lastActiveAt: true,
        tokenBalance: true,
        freeAiAppUsed: true,
        freeAiBuildUsed: true,
        subscription: { select: { status: true, provider: true, renewsAt: true, endsAt: true, createdAt: true, portalUrl: true } },
        apps: {
          where: { parentProjectId: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            suspended: true,
            appEnabled: true,
            createdAt: true,
            projectApps: { select: { id: true, status: true, suspended: true } },
            database: { select: { id: true } },
            bucket: { select: { id: true } },
            _count: { select: { members: true } },
          },
        },
        projectMembers: { select: { createdAt: true, project: { select: { id: true, name: true, slug: true, user: { select: { email: true } } } } } },
      },
    });
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const appIds = (await prisma.app.findMany({ where: { userId: id }, select: { id: true } })).map((app) => app.id);

    const [tokenTotals, recentUsage, billingEvents, deployments, deploymentStats, auditEntries] = await Promise.all([
      prisma.tokenUsage.aggregate({ where: { userId: id }, _sum: { tokens: true }, _count: { _all: true } }),
      prisma.tokenUsage.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, appName: true, appId: true, tokens: true, free: true, createdAt: true } }),
      prisma.billingEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, amountCents: true, createdAt: true } }),
      prisma.deployment.findMany({
        where: { appId: { in: appIds } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, status: true, step: true, createdAt: true, startedAt: true, finishedAt: true, app: { select: { slug: true } } },
      }),
      prisma.deployment.groupBy({ by: ["status"], where: { appId: { in: appIds } }, _count: { _all: true } }),
      prisma.adminAuditLog.findMany({ where: { targetId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    const { subscription, apps, projectMembers, ...profile } = user;
    const userPlan = planOf(subscription);

    return c.json({
      user: { ...profile, plan: userPlan.name, projectLimit: userPlan.projects },
      subscription,
      projects: apps.map((project) => {
        const list = projectApps(project);
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          createdAt: project.createdAt,
          apps: list.length,
          runningApps: list.filter((app) => app.status === "RUNNING").length,
          suspended: list.some((app) => app.suspended),
          hasDatabase: !!project.database,
          hasBucket: !!project.bucket,
          members: project._count.members,
        };
      }),
      memberships: projectMembers.map((membership) => ({
        id: membership.project.id,
        name: membership.project.name,
        slug: membership.project.slug,
        ownerEmail: membership.project.user.email,
        joinedAt: membership.createdAt,
      })),
      tokens: { total: tokenTotals._sum.tokens ?? 0, runs: tokenTotals._count._all, recent: recentUsage },
      billingEvents: billingEvents.map((event) => ({ id: event.id, type: event.type, amount: event.amountCents / 100, createdAt: event.createdAt })),
      deployments: deployments.map(({ app, ...deployment }) => ({ ...deployment, slug: app.slug })),
      deploymentStats: deploymentStats.map((row) => ({ status: row.status, count: row._count._all })),
      audit: auditEntries,
    });
  })
  .get("/projects", validate("query", adminProjectsQuerySchema), async (c) => {
    const { page, search, state, sort } = c.req.valid("query");
    const where = projectsWhere(search, state);

    const [projects, total] = await Promise.all([
      prisma.app.findMany({
        where,
        orderBy: [projectsOrder(sort), { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          suspended: true,
          appEnabled: true,
          createdAt: true,
          updatedAt: true,
          projectApps: { select: { id: true, status: true, suspended: true, _count: { select: { deployments: true, domains: true } } } },
          user: { select: { id: true, email: true } },
          database: { select: { dbName: true, blocked: true } },
          bucket: { select: { id: true } },
          _count: { select: { deployments: true, domains: true, members: true } },
        },
      }),
      prisma.app.count({ where }),
    ]);

    const appIds = projects.flatMap((project) => projectApps(project).map((app) => app.id));
    const dbNames = projects.flatMap((project) => {
      if (project.database) {
        return [project.database.dbName];
      }
      return [];
    });
    const [usage, sizes] = await Promise.all([latestUsage(appIds), databaseSizes(dbNames).catch(() => new Map<string, number>())]);

    return c.json({
      projects: projects.map((project) => {
        const list = projectApps(project);
        const samples = list.flatMap((app) => {
          const sample = usage.get(app.id);
          if (sample) {
            return [sample];
          }
          return [];
        });
        let databaseBytes: number | null = null;
        if (project.database) {
          databaseBytes = sizes.get(project.database.dbName) ?? 0;
        }
        let memoryBytes: number | null = null;
        let cpuPercent: number | null = null;
        if (samples.length) {
          memoryBytes = samples.reduce((sum, sample) => sum + sample.memoryBytes, 0);
          cpuPercent = Math.round(samples.reduce((sum, sample) => sum + sample.cpuPercent, 0) * 10) / 10;
        }
        return {
          id: project.id,
          name: project.name,
          slug: project.slug,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          owner: project.user,
          apps: list.length,
          runningApps: list.filter((app) => app.status === "RUNNING").length,
          suspended: list.some((app) => app.suspended),
          databaseBytes,
          databaseBlocked: project.database?.blocked ?? false,
          hasBucket: !!project.bucket,
          members: project._count.members,
          deployments: project._count.deployments + project.projectApps.reduce((sum, app) => sum + app._count.deployments, 0),
          domains: project._count.domains + project.projectApps.reduce((sum, app) => sum + app._count.domains, 0),
          memoryBytes,
          cpuPercent,
        };
      }),
      total,
      page,
      pages: pages(total, PAGE_SIZE),
    });
  })
  .get("/projects/:id", async (c) => {
    const project = await prisma.app.findUnique({
      where: { id: c.req.param("id"), parentProjectId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        kind: true,
        status: true,
        suspended: true,
        appEnabled: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, name: true } },
        database: { select: { name: true, dbName: true, blocked: true, createdAt: true } },
        bucket: { select: { name: true, minioName: true, createdAt: true } },
        members: { select: { createdAt: true, user: { select: { id: true, email: true, name: true } } } },
        projectApps: { select: { id: true } },
      },
    });
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const appIds = project.projectApps.map((app) => app.id);
    if (project.appEnabled) {
      appIds.unshift(project.id);
    }

    const apps = await prisma.app.findMany({
      where: { id: { in: appIds } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        appName: true,
        slug: true,
        kind: true,
        status: true,
        suspended: true,
        aiStatus: true,
        dockerfile: true,
        createdAt: true,
        domains: { select: { id: true, hostname: true, status: true, error: true } },
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, status: true, step: true, createdAt: true, startedAt: true, finishedAt: true },
        },
      },
    });

    const [live, databaseBytes, storageBytes, history] = await Promise.all([
      Promise.all(
        apps.map(async (app) => {
          if (app.status !== "RUNNING") {
            return null;
          }
          return containerUsage(containerName(app.slug));
        }),
      ),
      projectDatabaseBytes(project.database),
      projectStorageBytes(project.bucket),
      projectHistory(appIds),
    ]);

    return c.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        owner: project.user,
        members: project.members.map((member) => ({ ...member.user, joinedAt: member.createdAt })),
        database: withBytes(project.database, databaseBytes),
        bucket: withBytes(project.bucket, storageBytes),
      },
      apps: apps.map((app, index) => ({
        id: app.id,
        name: app.appName ?? app.name,
        slug: app.slug,
        url: appUrl(app.slug),
        kind: app.kind,
        status: app.status,
        suspended: app.suspended,
        aiStatus: app.aiStatus,
        hasDockerfile: Boolean(app.dockerfile),
        createdAt: app.createdAt,
        domains: app.domains,
        deployments: app.deployments,
        usage: live[index],
      })),
      history,
    });
  })
  .delete("/projects/:id", async (c) => {
    const admin = c.get("user");
    const project = await prisma.app.findUnique({
      where: { id: c.req.param("id"), parentProjectId: null },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const result = await deleteProject(project);
    if (!result.ok) {
      return c.json({ error: result.error }, 409);
    }

    let emailSent = true;
    try {
      await sendProjectDeletedEmail(project.user.email, project.user.name, project.name, appHost(project.slug));
    } catch (error) {
      console.error("Failed to send project deleted email", error);
      emailSent = false;
    }
    await audit(admin, "project.delete", { type: "project", id: project.id, label: project.slug }, { ownerEmail: project.user.email, emailSent });

    return c.json({ message: "Project deleted", emailSent });
  })
  .delete("/users/:id", async (c) => {
    const admin = c.get("user");
    const found = await findManageableUser(admin.id, c.req.param("id"));
    if ("error" in found) {
      return c.json({ error: found.error }, found.status);
    }

    const result = await closeAccount(found.target);
    if (!result.ok) {
      return c.json({ error: result.error }, 409);
    }
    await audit(admin, "user.delete", { type: "user", id: found.target.id, label: found.target.email }, { emailSent: result.emailSent });

    return c.json({ message: "User deleted", emailSent: result.emailSent });
  })
  .post("/users/:id/block-domain", async (c) => {
    const admin = c.get("user");
    const found = await findManageableUser(admin.id, c.req.param("id"));
    if ("error" in found) {
      return c.json({ error: found.error }, found.status);
    }

    const domain = emailDomain(found.target.email);
    await prisma.blockedDomain.upsert({ where: { domain }, create: { domain }, update: {} });
    const result = await closeAccount(found.target);
    if (!result.ok) {
      await audit(admin, "user.block_domain", { type: "user", id: found.target.id, label: found.target.email }, { domain, deleted: false });
      return c.json({ error: `${domain} is blocked, but the account could not be deleted: ${result.error}` }, 409);
    }
    await audit(admin, "user.block_domain", { type: "user", id: found.target.id, label: found.target.email }, { domain, deleted: true, emailSent: result.emailSent });

    return c.json({ message: "Domain blocked and user deleted", emailSent: result.emailSent });
  })
  .post("/users/:id/block", async (c) => {
    const admin = c.get("user");
    const found = await findManageableUser(admin.id, c.req.param("id"));
    if ("error" in found) {
      return c.json({ error: found.error }, found.status);
    }

    await prisma.user.update({ where: { id: found.target.id }, data: { blocked: true } });
    const apps = await prisma.app.findMany({
      where: { userId: found.target.id, status: { in: ["RUNNING", "DEPLOYING"] } },
      select: { id: true, slug: true },
    });
    let stopped = 0;
    let failed = 0;
    for (const app of apps) {
      try {
        await stopContainer(containerName(app.slug));
        await prisma.app.update({ where: { id: app.id }, data: { status: "STOPPED" } });
        stopped += 1;
      } catch (error) {
        console.error(`Failed to stop ${app.slug} while blocking user ${found.target.id}`, error);
        failed += 1;
      }
    }
    await audit(admin, "user.block", { type: "user", id: found.target.id, label: found.target.email }, { stopped, failed });

    return c.json({ message: "User blocked", stopped, failed });
  })
  .post("/users/:id/unblock", async (c) => {
    const admin = c.get("user");
    const found = await findManageableUser(admin.id, c.req.param("id"));
    if ("error" in found) {
      return c.json({ error: found.error }, found.status);
    }

    await prisma.user.update({ where: { id: found.target.id }, data: { blocked: false } });
    await audit(admin, "user.unblock", { type: "user", id: found.target.id, label: found.target.email });

    return c.json({ message: "User unblocked" });
  })
  .post("/users/:id/impersonate", async (c) => {
    const admin = c.get("user");
    const target = await prisma.user.findUnique({ where: { id: c.req.param("id") } });
    if (!target) {
      return c.json({ error: "User not found" }, 404);
    }
    if (target.id === admin.id) {
      return c.json({ error: "You are already signed in as this user" }, 400);
    }
    if (target.blocked) {
      return c.json({ error: "Blocked accounts cannot be impersonated" }, 400);
    }

    const token = await createToken({ userId: target.id, email: target.email, impersonatorId: admin.id }, IMPERSONATION_TTL);
    setAuthCookie(c, token);
    await audit(admin, "user.impersonate", { type: "user", id: target.id, label: target.email });

    return c.json({ user: { id: target.id, email: target.email, name: target.name } });
  })
  .get("/blocked-domains", async (c) => {
    const domains = await prisma.blockedDomain.findMany({ orderBy: { createdAt: "desc" } });
    return c.json({ domains });
  })
  .delete("/blocked-domains/:domain", async (c) => {
    const admin = c.get("user");
    const domain = c.req.param("domain").toLowerCase();
    const { count } = await prisma.blockedDomain.deleteMany({ where: { domain } });
    if (!count) {
      return c.json({ error: "Domain is not blocked" }, 404);
    }
    await audit(admin, "domain.unblock", { type: "domain", id: domain, label: domain });
    return c.json({ message: "Domain unblocked" });
  })
  .get("/audit", validate("query", adminAuditQuerySchema), async (c) => {
    const { page, search, action } = c.req.valid("query");
    const conditions: Prisma.AdminAuditLogWhereInput[] = [];
    if (action) {
      conditions.push({ action });
    }
    if (search) {
      conditions.push({
        OR: [{ adminEmail: { contains: search, mode: "insensitive" } }, { targetLabel: { contains: search, mode: "insensitive" } }],
      });
    }
    const where = { AND: conditions } satisfies Prisma.AdminAuditLogWhereInput;

    const [entries, total] = await Promise.all([
      prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * AUDIT_PAGE_SIZE, take: AUDIT_PAGE_SIZE }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return c.json({ entries, actions: AUDIT_ACTIONS, total, page, pages: pages(total, AUDIT_PAGE_SIZE) });
  })
  .get("/cleanup", async (c) => {
    const scan = await scanJunk();
    return c.json({ groups: scan.groups, totalBytes: scan.groups.reduce((total, group) => total + group.bytes, 0) });
  })
  .post("/cleanup", async (c) => {
    const admin = c.get("user");
    const result = await cleanJunk();
    await audit(admin, "cleanup.run", { type: "system" }, { freedBytes: result.freedBytes });
    return c.json(result);
  });
