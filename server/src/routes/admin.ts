import { Hono } from "hono";
import { statfs } from "node:fs/promises";
import os from "node:os";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createToken, setAuthCookie } from "../lib/auth.js";
import { docker, containerName } from "../lib/docker.js";
import { minio } from "../lib/minio.js";
import { databaseSizes, userdbStats } from "../lib/userdb.js";
import { deleteProject } from "../lib/delete-project.js";
import { appHost } from "../lib/domains.js";
import { sendProjectDeletedEmail } from "../lib/email.js";
import { LIMITS } from "../lib/limits.js";
import { validate } from "../lib/validator.js";
import { adminAnalyticsQuerySchema, adminUsersQuerySchema } from "../lib/validations.js";
import { requireAdmin } from "../middleware/require-admin.js";
import type { UserEnv } from "../lib/types.js";

const USERS_PER_PAGE = 25;
const USAGE_PROJECTS = 200;
const IMPERSONATION_TTL = "2h";

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

const emailsSince = async (since: Date) => {
  const rows = await prisma.emailLog.groupBy({
    by: ["projectId"],
    where: { createdAt: { gte: since }, status: "SENT" },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.projectId, row._count._all]));
};

type ContainerStats = {
  memory_stats: { usage?: number };
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number; online_cpus?: number };
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage?: number };
};

const containerUsage = async (name: string) => {
  try {
    const stats = (await docker.getContainer(name).stats({ stream: false })) as ContainerStats;
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = (stats.cpu_stats.system_cpu_usage ?? 0) - (stats.precpu_stats.system_cpu_usage ?? 0);
    let cpuPercent = 0;
    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus ?? 1) * 100;
    }
    return { memoryBytes: stats.memory_stats.usage ?? 0, cpuPercent: Math.round(cpuPercent * 10) / 10 };
  } catch {
    return null;
  }
};

type AnalyticsRow = {
  day: string;
  signups: number;
  projects: number;
  deployments: number;
  failedDeployments: number;
  emails: number;
  failedEmails: number;
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
    ]);

    const [queued, building, oldestQueued, failedLastDay, apps, disk] = await Promise.all([
      prisma.deployment.count({ where: { status: "QUEUED" } }),
      prisma.deployment.count({ where: { status: "BUILDING" } }),
      prisma.deployment.findFirst({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.deployment.count({ where: { status: "FAILED", createdAt: { gte: dayAgo() } } }),
      prisma.app.groupBy({ by: ["status"], _count: { _all: true } }),
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
  .get("/analytics", validate("query", adminAnalyticsQuerySchema), async (c) => {
    const { days } = c.req.valid("query");

    const [series, users, verifiedUsers, projects, runningApps, databases, buckets, domains] = await Promise.all([
      prisma.$queryRaw<AnalyticsRow[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM users u WHERE u."createdAt" >= d.day AND u."createdAt" < d.day + interval '1 day') AS signups,
          (SELECT count(*)::int FROM apps a WHERE a."createdAt" >= d.day AND a."createdAt" < d.day + interval '1 day') AS projects,
          (SELECT count(*)::int FROM deployments p WHERE p."createdAt" >= d.day AND p."createdAt" < d.day + interval '1 day') AS deployments,
          (SELECT count(*)::int FROM deployments p WHERE p.status = 'FAILED' AND p."createdAt" >= d.day AND p."createdAt" < d.day + interval '1 day') AS "failedDeployments",
          (SELECT count(*)::int FROM email_logs e WHERE e.status = 'SENT' AND e."createdAt" >= d.day AND e."createdAt" < d.day + interval '1 day') AS emails,
          (SELECT count(*)::int FROM email_logs e WHERE e.status = 'FAILED' AND e."createdAt" >= d.day AND e."createdAt" < d.day + interval '1 day') AS "failedEmails"
        FROM generate_series(
          date_trunc('day', now() AT TIME ZONE 'utc') - (${days}::int - 1) * interval '1 day',
          date_trunc('day', now() AT TIME ZONE 'utc'),
          interval '1 day'
        ) AS d(day)
        ORDER BY d.day
      `,
      prisma.user.count(),
      prisma.user.count({ where: { verified: true } }),
      prisma.app.count(),
      prisma.app.count({ where: { status: "RUNNING" } }),
      prisma.database.count(),
      prisma.bucket.count(),
      prisma.appDomain.count({ where: { status: "ACTIVE" } }),
    ]);

    return c.json({
      days,
      series,
      totals: { users, verifiedUsers, projects, runningApps, databases, buckets, domains },
    });
  })
  .get("/usage", async (c) => {
    const [projects, emails] = await Promise.all([
      prisma.app.findMany({
        take: USAGE_PROJECTS,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          user: { select: { id: true, email: true } },
          database: { select: { dbName: true } },
          bucket: { select: { id: true } },
          _count: { select: { deployments: true, domains: true } },
        },
      }),
      emailsSince(dayAgo()),
    ]);

    const dbNames = projects.flatMap((project) => {
      if (project.database) {
        return [project.database.dbName];
      }
      return [];
    });

    const [sizes, containers] = await Promise.all([
      databaseSizes(dbNames).catch(() => new Map<string, number>()),
      Promise.all(
        projects.map((project) => {
          if (project.status !== "RUNNING") {
            return null;
          }
          return containerUsage(containerName(project.slug));
        }),
      ),
    ]);

    const rows = projects.map((project, index) => {
      let databaseBytes: number | null = null;
      if (project.database) {
        databaseBytes = sizes.get(project.database.dbName) ?? 0;
      }
      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        owner: project.user,
        container: containers[index],
        databaseBytes,
        hasBucket: !!project.bucket,
        emailsToday: emails.get(project.id) ?? 0,
        deployments: project._count.deployments,
        domains: project._count.domains,
      };
    });

    return c.json({
      projects: rows,
      limits: { memoryBytes: 512 * 1024 * 1024, emailsPerDay: LIMITS.emailsPerDay },
      totals: {
        memoryBytes: rows.reduce((sum, row) => sum + (row.container?.memoryBytes ?? 0), 0),
        databaseBytes: rows.reduce((sum, row) => sum + (row.databaseBytes ?? 0), 0),
        emailsToday: rows.reduce((sum, row) => sum + row.emailsToday, 0),
      },
    });
  })
  .get("/users", validate("query", adminUsersQuerySchema), async (c) => {
    const { page, search } = c.req.valid("query");
    let where: Prisma.UserWhereInput = {};
    if (search) {
      where = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [users, total, emails] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * USERS_PER_PAGE,
        take: USERS_PER_PAGE,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          blocked: true,
          createdAt: true,
          apps: { select: { id: true, status: true } },
        },
      }),
      prisma.user.count({ where }),
      emailsSince(dayAgo()),
    ]);

    return c.json({
      users: users.map(({ apps, ...user }) => ({
        ...user,
        projects: apps.length,
        runningApps: apps.filter((app) => app.status === "RUNNING").length,
        emailsToday: apps.reduce((sum, app) => sum + (emails.get(app.id) ?? 0), 0),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / USERS_PER_PAGE)),
      projectLimit: LIMITS.apps,
    });
  })
  .delete("/projects/:id", async (c) => {
    const admin = c.get("user");
    const project = await prisma.app.findUnique({
      where: { id: c.req.param("id") },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    await deleteProject(project);
    console.log(`Admin ${admin.email} (${admin.id}) deleted project ${project.slug} (${project.id}) owned by ${project.user.email}`);

    let emailSent = true;
    try {
      await sendProjectDeletedEmail(project.user.email, project.user.name, project.name, appHost(project.slug));
    } catch (error) {
      console.error("Failed to send project deleted email", error);
      emailSent = false;
    }

    return c.json({ message: "Project deleted", emailSent });
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
    console.log(`Admin ${admin.email} (${admin.id}) started impersonating ${target.email} (${target.id})`);

    return c.json({ user: { id: target.id, email: target.email, name: target.name } });
  });
