import { Hono } from "hono";
import { statfs } from "node:fs/promises";
import os from "node:os";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { createToken, setAuthCookie } from "../lib/auth.js";
import { docker, containerName, stopContainer } from "../lib/docker.js";
import { minio } from "../lib/minio.js";
import { databaseSizes, userdbStats } from "../lib/userdb.js";
import { deleteProject, deleteUserAccount } from "../lib/delete-project.js";
import { cleanJunk, scanJunk } from "../lib/cleanup.js";
import { appHost } from "../lib/domains.js";
import { sendAccountDeletedEmail, sendProjectDeletedEmail } from "../lib/email.js";
import { LIMITS } from "../lib/limits.js";
import { emailDomain } from "../lib/email-domains.js";
import { validate } from "../lib/validator.js";
import { adminAnalyticsQuerySchema, adminUsersQuerySchema } from "../lib/validations.js";
import { requireAdmin } from "../middleware/require-admin.js";
import type { UserEnv } from "../lib/types.js";

const USERS_PER_PAGE = 25;
const USAGE_PROJECTS = 200;
const IMPERSONATION_TTL = "2h";

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
  .get("/analytics", validate("query", adminAnalyticsQuerySchema), async (c) => {
    const { days } = c.req.valid("query");

    const [series, users, verifiedUsers, projects, runningApps, databases, buckets, domains] = await Promise.all([
      prisma.$queryRaw<AnalyticsRow[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM users u WHERE u."createdAt" >= d.day AND u."createdAt" < d.day + interval '1 day') AS signups,
          (SELECT count(*)::int FROM apps a WHERE a."parentProjectId" IS NULL AND a."createdAt" >= d.day AND a."createdAt" < d.day + interval '1 day') AS projects,
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
      prisma.app.count({ where: { parentProjectId: null } }),
      prisma.app.count({ where: { appEnabled: true, status: "RUNNING" } }),
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
        where: { parentProjectId: null },
        take: USAGE_PROJECTS,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          appEnabled: true,
          projectApps: { select: { slug: true, status: true, _count: { select: { deployments: true, domains: true } } } },
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
        projects.map(async (project) => {
          const apps = [...(project.appEnabled ? [project] : []), ...project.projectApps];
          const stats = await Promise.all(apps.filter((app) => app.status === "RUNNING").map((app) => containerUsage(containerName(app.slug))));
          const running = stats.filter((stat) => stat !== null);
          if (!running.length) {
            return null;
          }
          return { memoryBytes: running.reduce((sum, stat) => sum + stat.memoryBytes, 0), cpuPercent: running.reduce((sum, stat) => sum + stat.cpuPercent, 0) };
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
        status: [...(project.appEnabled ? [project] : []), ...project.projectApps].some((app) => app.status === "RUNNING") ? "RUNNING" : "IDLE",
        owner: project.user,
        container: containers[index],
        databaseBytes,
        hasBucket: !!project.bucket,
        emailsToday: emails.get(project.id) ?? 0,
        deployments: project._count.deployments + project.projectApps.reduce((sum, app) => sum + app._count.deployments, 0),
        domains: project._count.domains + project.projectApps.reduce((sum, app) => sum + app._count.domains, 0),
      };
    });

    return c.json({
      projects: rows,
      limits: { memoryBytes: 512 * 1024 * 1024 * LIMITS.apps, emailsPerDay: LIMITS.emailsPerDay },
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
          apps: { select: { id: true, status: true, parentProjectId: true, appEnabled: true } },
        },
      }),
      prisma.user.count({ where }),
      emailsSince(dayAgo()),
    ]);

    return c.json({
      users: users.map(({ apps, ...user }) => ({
        ...user,
        projects: apps.filter((app) => app.parentProjectId === null).length,
        runningApps: apps.filter((app) => app.appEnabled && app.status === "RUNNING").length,
        emailsToday: apps.reduce((sum, app) => sum + (emails.get(app.id) ?? 0), 0),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / USERS_PER_PAGE)),
      projectLimit: LIMITS.projects,
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
    console.log(`Admin ${admin.email} (${admin.id}) deleted user ${found.target.email} (${found.target.id}) and all of their projects`);

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
      return c.json({ error: `${domain} is blocked, but the account could not be deleted: ${result.error}` }, 409);
    }
    console.log(`Admin ${admin.email} (${admin.id}) blocked the email domain ${domain} and deleted user ${found.target.email} (${found.target.id})`);

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
    console.log(`Admin ${admin.email} (${admin.id}) blocked user ${found.target.email} (${found.target.id}), ${stopped} apps stopped`);

    return c.json({ message: "User blocked", stopped, failed });
  })
  .post("/users/:id/unblock", async (c) => {
    const admin = c.get("user");
    const found = await findManageableUser(admin.id, c.req.param("id"));
    if ("error" in found) {
      return c.json({ error: found.error }, found.status);
    }

    await prisma.user.update({ where: { id: found.target.id }, data: { blocked: false } });
    console.log(`Admin ${admin.email} (${admin.id}) unblocked user ${found.target.email} (${found.target.id})`);

    return c.json({ message: "User unblocked" });
  })
  .get("/cleanup", async (c) => {
    const scan = await scanJunk();
    return c.json({ groups: scan.groups, totalBytes: scan.groups.reduce((total, group) => total + group.bytes, 0) });
  })
  .post("/cleanup", async (c) => {
    const admin = c.get("user");
    const result = await cleanJunk();
    console.log(`Admin ${admin.email} (${admin.id}) ran the junk cleaner, about ${result.freedBytes} bytes freed`);
    return c.json(result);
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
