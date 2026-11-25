import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { PRO } from "../lib/plans.js";
import { validate } from "../lib/validator.js";
import { adminPagedRangeQuerySchema, adminRangeQuerySchema, adminResourcesQuerySchema } from "../lib/validations.js";
import { requireAdmin } from "../middleware/require-admin.js";
import type { UserEnv } from "../lib/types.js";

const PAGE_SIZE = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

const periods = (days: number) => {
  const now = new Date();
  const start = new Date(now.getTime() - days * DAY_MS);
  const previousStart = new Date(now.getTime() - 2 * days * DAY_MS);
  return { now, start, previousStart };
};

const pages = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

const compare = (current: number, previous: number) => ({ current, previous });

const ratio = (part: number, whole: number) => {
  if (whole <= 0) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10;
};

const daySeries = (days: number) => Prisma.sql`
  generate_series(
    date_trunc('day', now() AT TIME ZONE 'utc') - (${days}::int - 1) * interval '1 day',
    date_trunc('day', now() AT TIME ZONE 'utc'),
    interval '1 day'
  ) AS d(day)
`;

const ACTIVE_SUBSCRIPTION = Prisma.sql`(s.status = 'ACTIVE' OR (s.status = 'CANCELLED' AND s."endsAt" > now()))`;

const SUCCEEDED = Prisma.sql`(p.status = 'RUNNING' OR (p.status = 'SUPERSEDED' AND p."imageTag" IS NOT NULL))`;

type BuildStats = {
  total: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  durationP50: number | null;
  durationP95: number | null;
  waitP50: number | null;
  waitP95: number | null;
};

const buildStats = async (from: Date, to: Date) => {
  const rows = await prisma.$queryRaw<BuildStats[]>`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE ${SUCCEEDED})::int AS succeeded,
      count(*) FILTER (WHERE p.status = 'FAILED')::int AS failed,
      count(*) FILTER (WHERE p.status = 'SUPERSEDED' AND p."imageTag" IS NULL)::int AS cancelled,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM p."finishedAt" - p."startedAt")) FILTER (WHERE p."startedAt" IS NOT NULL AND p."finishedAt" IS NOT NULL) AS "durationP50",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM p."finishedAt" - p."startedAt")) FILTER (WHERE p."startedAt" IS NOT NULL AND p."finishedAt" IS NOT NULL) AS "durationP95",
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM p."startedAt" - p."createdAt")) FILTER (WHERE p."startedAt" IS NOT NULL) AS "waitP50",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM p."startedAt" - p."createdAt")) FILTER (WHERE p."startedAt" IS NOT NULL) AS "waitP95"
    FROM deployments p
    WHERE p."createdAt" >= ${from} AND p."createdAt" < ${to}
  `;
  const row = rows[0];
  return { ...row, successRate: ratio(row.succeeded, row.succeeded + row.failed) };
};

const tokenTotals = async (from: Date, to: Date) => {
  const rows = await prisma.$queryRaw<{ tokens: number; paid: number; free: number; runs: number; users: number }[]>`
    SELECT
      coalesce(sum(tokens), 0)::float8 AS tokens,
      coalesce(sum(tokens) FILTER (WHERE NOT free), 0)::float8 AS paid,
      coalesce(sum(tokens) FILTER (WHERE free), 0)::float8 AS free,
      count(*)::int AS runs,
      count(DISTINCT "userId")::int AS users
    FROM token_usages
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
  `;
  return rows[0];
};

const RESOURCE_BUCKETS = {
  "24h": { hours: 24, seconds: 5 * 60 },
  "7d": { hours: 7 * 24, seconds: 30 * 60 },
  "30d": { hours: 30 * 24, seconds: 2 * 60 * 60 },
} as const;

type ResourceRow = {
  t: Date;
  cpuPercent: number;
  load1: number;
  memUsed: number;
  memTotal: number;
  diskUsed: number;
  diskTotal: number;
  containersRunning: number;
  appsRunning: number;
  buildsQueued: number;
  buildsRunning: number;
  dbBytes: number;
  storageBytes: number;
};

export const adminAnalyticsRoutes = new Hono<UserEnv>()
  .use(requireAdmin)
  .get("/overview", validate("query", adminRangeQuerySchema), async (c) => {
    const { days } = c.req.valid("query");
    const { now, start, previousStart } = periods(days);

    const [
      users,
      verifiedUsers,
      projects,
      apps,
      runningApps,
      databases,
      buckets,
      domains,
      subscribers,
      signups,
      previousSignups,
      newProjects,
      previousNewProjects,
      active1,
      active7,
      active30,
      builds,
      previousBuilds,
      tokens,
      previousTokens,
      revenue,
      previousRevenue,
      series,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verified: true } }),
      prisma.app.count({ where: { parentProjectId: null } }),
      prisma.app.count({ where: { appEnabled: true } }),
      prisma.app.count({ where: { appEnabled: true, status: "RUNNING" } }),
      prisma.database.count(),
      prisma.bucket.count(),
      prisma.appDomain.count({ where: { status: "ACTIVE" } }),
      prisma.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM subscriptions s WHERE ${ACTIVE_SUBSCRIPTION}`,
      prisma.user.count({ where: { createdAt: { gte: start } } }),
      prisma.user.count({ where: { createdAt: { gte: previousStart, lt: start } } }),
      prisma.app.count({ where: { parentProjectId: null, createdAt: { gte: start } } }),
      prisma.app.count({ where: { parentProjectId: null, createdAt: { gte: previousStart, lt: start } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(now.getTime() - DAY_MS) } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } } }),
      buildStats(start, now),
      buildStats(previousStart, start),
      tokenTotals(start, now),
      tokenTotals(previousStart, start),
      prisma.billingEvent.aggregate({ where: { createdAt: { gte: start } }, _sum: { amountCents: true } }),
      prisma.billingEvent.aggregate({ where: { createdAt: { gte: previousStart, lt: start } }, _sum: { amountCents: true } }),
      prisma.$queryRaw<{ day: string; signups: number; projects: number; deployments: number; failed: number; tokens: number }[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM users u WHERE u."createdAt" >= d.day AND u."createdAt" < d.day + interval '1 day') AS signups,
          (SELECT count(*)::int FROM apps a WHERE a."parentProjectId" IS NULL AND a."createdAt" >= d.day AND a."createdAt" < d.day + interval '1 day') AS projects,
          (SELECT count(*)::int FROM deployments p WHERE p."createdAt" >= d.day AND p."createdAt" < d.day + interval '1 day') AS deployments,
          (SELECT count(*)::int FROM deployments p WHERE p.status = 'FAILED' AND p."createdAt" >= d.day AND p."createdAt" < d.day + interval '1 day') AS failed,
          (SELECT coalesce(sum(t.tokens), 0)::float8 FROM token_usages t WHERE t."createdAt" >= d.day AND t."createdAt" < d.day + interval '1 day') AS tokens
        FROM ${daySeries(days)}
        ORDER BY d.day
      `,
    ]);

    const proSubscribers = subscribers[0].count;

    return c.json({
      days,
      totals: {
        users,
        verifiedUsers,
        projects,
        apps,
        runningApps,
        databases,
        buckets,
        domains,
        proSubscribers,
        mrr: proSubscribers * PRO.price,
        conversionRate: ratio(proSubscribers, verifiedUsers),
      },
      active: { day: active1, week: active7, month: active30 },
      period: {
        signups: compare(signups, previousSignups),
        projects: compare(newProjects, previousNewProjects),
        deployments: compare(builds.total, previousBuilds.total),
        successRate: { current: builds.successRate, previous: previousBuilds.successRate },
        tokens: compare(tokens.tokens, previousTokens.tokens),
        revenue: compare((revenue._sum.amountCents ?? 0) / 100, (previousRevenue._sum.amountCents ?? 0) / 100),
      },
      series,
    });
  })
  .get("/growth", validate("query", adminRangeQuerySchema), async (c) => {
    const { days } = c.req.valid("query");
    const { start } = periods(days);

    const [series, funnelRows, domains, baseline] = await Promise.all([
      prisma.$queryRaw<{ day: string; signups: number; verified: number; projects: number; apps: number; aiApps: number }[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM users u WHERE u."createdAt" >= d.day AND u."createdAt" < d.day + interval '1 day') AS signups,
          (SELECT count(*)::int FROM users u WHERE u.verified AND u."createdAt" >= d.day AND u."createdAt" < d.day + interval '1 day') AS verified,
          (SELECT count(*)::int FROM apps a WHERE a."parentProjectId" IS NULL AND a."createdAt" >= d.day AND a."createdAt" < d.day + interval '1 day') AS projects,
          (SELECT count(*)::int FROM apps a WHERE a."appEnabled" AND a.kind = 'NODE' AND a."createdAt" >= d.day AND a."createdAt" < d.day + interval '1 day') AS apps,
          (SELECT count(*)::int FROM apps a WHERE a.kind = 'AI' AND a."createdAt" >= d.day AND a."createdAt" < d.day + interval '1 day') AS "aiApps"
        FROM ${daySeries(days)}
        ORDER BY d.day
      `,
      prisma.$queryRaw<{ signedUp: number; verified: number; createdProject: number; deployed: number; pro: number }[]>`
        WITH cohort AS (SELECT id, verified FROM users WHERE "createdAt" >= ${start})
        SELECT
          count(*)::int AS "signedUp",
          count(*) FILTER (WHERE c.verified)::int AS verified,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM apps a WHERE a."userId" = c.id AND a."parentProjectId" IS NULL))::int AS "createdProject",
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM apps a
            WHERE a."userId" = c.id AND (
              a.status = 'RUNNING'
              OR EXISTS (SELECT 1 FROM deployments p WHERE p."appId" = a.id AND ${SUCCEEDED})
            )
          ))::int AS deployed,
          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM subscriptions s WHERE s."userId" = c.id))::int AS pro
        FROM cohort c
      `,
      prisma.$queryRaw<{ domain: string; count: number }[]>`
        SELECT lower(split_part(email, '@', 2)) AS domain, count(*)::int AS count
        FROM users
        WHERE "createdAt" >= ${start}
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
      `,
      prisma.user.count({ where: { createdAt: { lt: new Date(new Date().setUTCHours(0, 0, 0, 0) - (days - 1) * DAY_MS) } } }),
    ]);

    let running = baseline;
    const cumulative = series.map((row) => {
      running += row.signups;
      return { day: row.day, users: running };
    });

    return c.json({ days, series, cumulative, funnel: funnelRows[0], domains });
  })
  .get("/revenue", validate("query", adminPagedRangeQuerySchema), async (c) => {
    const { days, page } = c.req.valid("query");
    const { now, start, previousStart } = periods(days);

    const [statusRows, verifiedUsers, lifetime, inRange, previousInRange, series, events, eventsTotal, pastDue] = await Promise.all([
      prisma.$queryRaw<{ active: number; pastDue: number; cancelling: number; ended: number }[]>`
        SELECT
          count(*) FILTER (WHERE ${ACTIVE_SUBSCRIPTION})::int AS active,
          count(*) FILTER (WHERE s.status = 'PAST_DUE')::int AS "pastDue",
          count(*) FILTER (WHERE s.status = 'CANCELLED' AND s."endsAt" > now())::int AS cancelling,
          count(*) FILTER (WHERE s.status = 'EXPIRED' OR (s.status = 'CANCELLED' AND (s."endsAt" IS NULL OR s."endsAt" <= now())))::int AS ended
        FROM subscriptions s
      `,
      prisma.user.count({ where: { verified: true } }),
      prisma.billingEvent.aggregate({ _sum: { amountCents: true } }),
      prisma.billingEvent.groupBy({ by: ["type"], where: { createdAt: { gte: start } }, _count: { _all: true }, _sum: { amountCents: true } }),
      prisma.billingEvent.groupBy({ by: ["type"], where: { createdAt: { gte: previousStart, lt: start } }, _count: { _all: true }, _sum: { amountCents: true } }),
      prisma.$queryRaw<{ day: string; subscribers: number; revenue: number; created: number; churned: number }[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          (SELECT count(*)::int FROM subscriptions s
            WHERE s."createdAt" < d.day + interval '1 day'
              AND ((s."endsAt" IS NULL AND s.status <> 'EXPIRED') OR s."endsAt" > d.day)) AS subscribers,
          (SELECT coalesce(sum(e."amountCents"), 0)::float8 / 100 FROM billing_events e WHERE e."createdAt" >= d.day AND e."createdAt" < d.day + interval '1 day') AS revenue,
          (SELECT count(*)::int FROM billing_events e WHERE e.type = 'CREATED' AND e."createdAt" >= d.day AND e."createdAt" < d.day + interval '1 day') AS created,
          (SELECT count(*)::int FROM billing_events e WHERE e.type IN ('CANCELLED', 'EXPIRED') AND e."createdAt" >= d.day AND e."createdAt" < d.day + interval '1 day') AS churned
        FROM ${daySeries(days)}
        ORDER BY d.day
      `,
      prisma.billingEvent.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      prisma.billingEvent.count(),
      prisma.subscription.findMany({
        where: { status: "PAST_DUE" },
        orderBy: { updatedAt: "desc" },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
    ]);

    const byType = (rows: typeof inRange, type: string) => rows.find((row) => row.type === type);
    const summarize = (rows: typeof inRange) => ({
      revenue: rows.reduce((sum, row) => sum + (row._sum.amountCents ?? 0), 0) / 100,
      created: byType(rows, "CREATED")?._count._all ?? 0,
      renewed: byType(rows, "RENEWED")?._count._all ?? 0,
      failed: byType(rows, "PAYMENT_FAILED")?._count._all ?? 0,
      churned: (byType(rows, "CANCELLED")?._count._all ?? 0) + (byType(rows, "EXPIRED")?._count._all ?? 0),
    });
    const current = summarize(inRange);
    const previous = summarize(previousInRange);
    const status = statusRows[0];

    return c.json({
      days,
      generatedAt: now,
      totals: {
        ...status,
        mrr: status.active * PRO.price,
        arr: status.active * PRO.price * 12,
        price: PRO.price,
        lifetimeRevenue: (lifetime._sum.amountCents ?? 0) / 100,
        conversionRate: ratio(status.active, verifiedUsers),
      },
      period: {
        revenue: compare(current.revenue, previous.revenue),
        created: compare(current.created, previous.created),
        renewed: compare(current.renewed, previous.renewed),
        failed: compare(current.failed, previous.failed),
        churned: compare(current.churned, previous.churned),
      },
      series,
      pastDue: pastDue.map((subscription) => ({
        id: subscription.id,
        user: subscription.user,
        renewsAt: subscription.renewsAt,
        updatedAt: subscription.updatedAt,
      })),
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        amount: event.amountCents / 100,
        user: event.user,
        createdAt: event.createdAt,
      })),
      eventsTotal,
      page,
      pages: pages(eventsTotal),
    });
  })
  .get("/builds", validate("query", adminPagedRangeQuerySchema), async (c) => {
    const { days, page } = c.req.valid("query");
    const { now, start, previousStart } = periods(days);

    const [current, previous, series, topFailing, failures, failuresTotal, queue] = await Promise.all([
      buildStats(start, now),
      buildStats(previousStart, start),
      prisma.$queryRaw<{ day: string; succeeded: number; failed: number; cancelled: number; durationP50: number | null }[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          count(p.id) FILTER (WHERE ${SUCCEEDED})::int AS succeeded,
          count(p.id) FILTER (WHERE p.status = 'FAILED')::int AS failed,
          count(p.id) FILTER (WHERE p.status = 'SUPERSEDED' AND p."imageTag" IS NULL)::int AS cancelled,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM p."finishedAt" - p."startedAt")) FILTER (WHERE p."startedAt" IS NOT NULL AND p."finishedAt" IS NOT NULL) AS "durationP50"
        FROM ${daySeries(days)}
        LEFT JOIN deployments p ON p."createdAt" >= d.day AND p."createdAt" < d.day + interval '1 day'
        GROUP BY d.day
        ORDER BY d.day
      `,
      prisma.$queryRaw<{ appId: string; slug: string; name: string; ownerEmail: string; failures: number; total: number; lastFailure: Date }[]>`
        SELECT
          a.id AS "appId",
          a.slug,
          coalesce(a."appName", a.name) AS name,
          u.email AS "ownerEmail",
          count(*) FILTER (WHERE p.status = 'FAILED')::int AS failures,
          count(*)::int AS total,
          max(p."createdAt") FILTER (WHERE p.status = 'FAILED') AS "lastFailure"
        FROM deployments p
        JOIN apps a ON a.id = p."appId"
        JOIN users u ON u.id = a."userId"
        WHERE p."createdAt" >= ${start}
        GROUP BY a.id, u.email
        HAVING count(*) FILTER (WHERE p.status = 'FAILED') > 0
        ORDER BY failures DESC
        LIMIT 10
      `,
      prisma.deployment.findMany({
        where: { status: "FAILED", createdAt: { gte: start } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          step: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          app: { select: { id: true, slug: true, name: true, appName: true, parentProjectId: true, user: { select: { id: true, email: true } } } },
        },
      }),
      prisma.deployment.count({ where: { status: "FAILED", createdAt: { gte: start } } }),
      prisma.deployment.findMany({
        where: { status: { in: ["QUEUED", "BUILDING"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, step: true, createdAt: true, startedAt: true, app: { select: { slug: true, user: { select: { email: true } } } } },
      }),
    ]);

    return c.json({
      days,
      current,
      previous,
      series,
      topFailing,
      queue: queue.map((item) => ({ id: item.id, status: item.status, step: item.step, createdAt: item.createdAt, startedAt: item.startedAt, slug: item.app.slug, ownerEmail: item.app.user.email })),
      failures: failures.map((item) => {
        let durationSeconds: number | null = null;
        if (item.startedAt && item.finishedAt) {
          durationSeconds = Math.round((item.finishedAt.getTime() - item.startedAt.getTime()) / 1000);
        }
        return {
          id: item.id,
          step: item.step,
          createdAt: item.createdAt,
          durationSeconds,
          app: { id: item.app.id, slug: item.app.slug, name: item.app.appName ?? item.app.name, projectId: item.app.parentProjectId ?? item.app.id },
          owner: item.app.user,
        };
      }),
      failuresTotal,
      page,
      pages: pages(failuresTotal),
    });
  })
  .get("/deployments/:id", async (c) => {
    const deployment = await prisma.deployment.findUnique({
      where: { id: c.req.param("id") },
      select: {
        id: true,
        status: true,
        step: true,
        log: true,
        imageTag: true,
        cloudBuildId: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
        app: { select: { id: true, slug: true, name: true, appName: true, parentProjectId: true, user: { select: { id: true, email: true } } } },
      },
    });
    if (!deployment) {
      return c.json({ error: "Deployment not found" }, 404);
    }
    const { app, ...rest } = deployment;
    return c.json({
      deployment: {
        ...rest,
        app: { id: app.id, slug: app.slug, name: app.appName ?? app.name, projectId: app.parentProjectId ?? app.id },
        owner: app.user,
      },
    });
  })
  .get("/ai", validate("query", adminRangeQuerySchema), async (c) => {
    const { days } = c.req.valid("query");
    const { now, start, previousStart } = periods(days);

    const [current, previous, series, topUsers, topApps, statuses, aiApps, balances, freeUsage] = await Promise.all([
      tokenTotals(start, now),
      tokenTotals(previousStart, start),
      prisma.$queryRaw<{ day: string; paid: number; free: number; runs: number }[]>`
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          coalesce(sum(t.tokens) FILTER (WHERE NOT t.free), 0)::float8 AS paid,
          coalesce(sum(t.tokens) FILTER (WHERE t.free), 0)::float8 AS free,
          count(t.id)::int AS runs
        FROM ${daySeries(days)}
        LEFT JOIN token_usages t ON t."createdAt" >= d.day AND t."createdAt" < d.day + interval '1 day'
        GROUP BY d.day
        ORDER BY d.day
      `,
      prisma.$queryRaw<{ userId: string; email: string; tokens: number; runs: number; balance: number }[]>`
        SELECT u.id AS "userId", u.email, coalesce(sum(t.tokens), 0)::float8 AS tokens, count(*)::int AS runs, u."tokenBalance" AS balance
        FROM token_usages t
        JOIN users u ON u.id = t."userId"
        WHERE t."createdAt" >= ${start}
        GROUP BY u.id
        ORDER BY tokens DESC
        LIMIT 10
      `,
      prisma.$queryRaw<{ appName: string; appId: string | null; tokens: number; runs: number; inputTokens: number; outputTokens: number }[]>`
        SELECT t."appName", t."appId", coalesce(sum(t.tokens), 0)::float8 AS tokens, count(*)::int AS runs,
          coalesce(sum(t."inputTokens"), 0)::float8 AS "inputTokens", coalesce(sum(t."outputTokens"), 0)::float8 AS "outputTokens"
        FROM token_usages t
        WHERE t."createdAt" >= ${start}
        GROUP BY t."appName", t."appId"
        ORDER BY tokens DESC
        LIMIT 10
      `,
      prisma.app.groupBy({ by: ["aiStatus"], where: { kind: "AI" }, _count: { _all: true } }),
      prisma.app.count({ where: { kind: "AI" } }),
      prisma.user.aggregate({ _sum: { tokenBalance: true } }),
      prisma.user.count({ where: { freeAiBuildUsed: true } }),
    ]);

    return c.json({
      days,
      period: {
        tokens: compare(current.tokens, previous.tokens),
        paid: compare(current.paid, previous.paid),
        free: compare(current.free, previous.free),
        runs: compare(current.runs, previous.runs),
        users: compare(current.users, previous.users),
      },
      totals: {
        aiApps,
        outstandingBalance: balances._sum.tokenBalance ?? 0,
        freeBuildsUsed: freeUsage,
        statuses: statuses.map((row) => ({ status: row.aiStatus, count: row._count._all })),
      },
      series,
      topUsers,
      topApps,
    });
  })
  .get("/resources", validate("query", adminResourcesQuerySchema), async (c) => {
    const { range } = c.req.valid("query");
    const bucket = RESOURCE_BUCKETS[range];
    const since = new Date(Date.now() - bucket.hours * 60 * 60 * 1000);

    const [series, latest, topApps] = await Promise.all([
      prisma.$queryRaw<ResourceRow[]>`
        SELECT
          to_timestamp(floor(extract(epoch FROM "createdAt") / ${bucket.seconds}::int) * ${bucket.seconds}::int) AS t,
          avg("cpuPercent")::float8 AS "cpuPercent",
          avg(load1)::float8 AS load1,
          avg("memUsed")::float8 AS "memUsed",
          max("memTotal")::float8 AS "memTotal",
          avg("diskUsed")::float8 AS "diskUsed",
          max("diskTotal")::float8 AS "diskTotal",
          round(avg("containersRunning"))::int AS "containersRunning",
          round(avg("appsRunning"))::int AS "appsRunning",
          max("buildsQueued")::int AS "buildsQueued",
          max("buildsRunning")::int AS "buildsRunning",
          avg("dbBytes")::float8 AS "dbBytes",
          avg("storageBytes")::float8 AS "storageBytes"
        FROM metric_samples
        WHERE "createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.metricSample.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.$queryRaw<{ appId: string; slug: string; name: string; projectId: string; ownerEmail: string; avgMemory: number; maxMemory: number; avgCpu: number; maxCpu: number }[]>`
        SELECT
          a.id AS "appId",
          a.slug,
          coalesce(a."appName", a.name) AS name,
          coalesce(a."parentProjectId", a.id) AS "projectId",
          u.email AS "ownerEmail",
          avg(m."memoryBytes")::float8 AS "avgMemory",
          max(m."memoryBytes")::float8 AS "maxMemory",
          avg(m."cpuPercent")::float8 AS "avgCpu",
          max(m."cpuPercent")::float8 AS "maxCpu"
        FROM app_metric_samples m
        JOIN apps a ON a.id = m."appId"
        JOIN users u ON u.id = a."userId"
        WHERE m."createdAt" >= ${since}
        GROUP BY a.id, u.email
        ORDER BY "avgMemory" DESC
        LIMIT 15
      `,
    ]);

    let latestSample = null;
    if (latest) {
      latestSample = {
        createdAt: latest.createdAt,
        cpuPercent: latest.cpuPercent,
        load1: latest.load1,
        memUsed: Number(latest.memUsed),
        memTotal: Number(latest.memTotal),
        diskUsed: Number(latest.diskUsed),
        diskTotal: Number(latest.diskTotal),
        containersRunning: latest.containersRunning,
        appsRunning: latest.appsRunning,
        dbBytes: Number(latest.dbBytes),
        storageBytes: Number(latest.storageBytes),
      };
    }

    return c.json({ range, series, latest: latestSample, topApps });
  });
