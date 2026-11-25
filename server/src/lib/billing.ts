import type { App, BillingEventType, Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { containerName, startContainer, stopContainer } from "./docker.js";
import { bucketSize, setBucketQuota } from "./minio.js";
import { databaseSizes, setRoleLogin } from "./userdb.js";
import { projectAppsWhere } from "./project-apps.js";
import { startAiApp } from "./ai-apps.js";
import { payments, type PaymentEvent, type ProviderSubscription } from "./payments.js";
import { FREE, PRO, type Plan } from "./plans.js";

const WORKER_INTERVAL_MS = 5 * 60 * 1000;

export const isSubscriptionActive = (subscription: Pick<Subscription, "status" | "endsAt"> | null) => {
  if (!subscription) {
    return false;
  }
  if (subscription.status === "ACTIVE") {
    return true;
  }
  if (subscription.status === "CANCELLED" && subscription.endsAt && subscription.endsAt > new Date()) {
    return true;
  }
  return false;
};

export const userPlan = async (userId: string): Promise<Plan> => {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (isSubscriptionActive(subscription)) {
    return PRO;
  }
  return FREE;
};

const ownedProjects = (userId: string) => {
  return prisma.app.findMany({
    where: { userId, parentProjectId: null, deleting: false },
    orderBy: { createdAt: "asc" },
    include: { database: true, bucket: true },
  });
};

export const projectEntitlement = async (projectId: string) => {
  const project = await prisma.app.findUniqueOrThrow({ where: { id: projectId }, select: { userId: true } });
  const [plan, projects] = await Promise.all([
    userPlan(project.userId),
    prisma.app.findMany({
      where: { userId: project.userId, parentProjectId: null, deleting: false },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);
  const index = projects.findIndex((item) => item.id === projectId);
  const allowed = index >= 0 && index < plan.projects;
  let apps = plan.apps;
  if (!allowed) {
    apps = 0;
  }
  return { plan, allowed, limits: { apps, dbBytes: plan.dbBytes, storageBytes: plan.storageBytes } };
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const buildLimitError = async (projectId: string) => {
  const project = await prisma.app.findUniqueOrThrow({ where: { id: projectId }, select: { userId: true } });
  const plan = await userPlan(project.userId);
  const used = await prisma.deployment.count({
    where: { app: { userId: project.userId }, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
  });
  if (used < plan.buildsPerDay) {
    return null;
  }
  return `Daily build limit reached (${plan.buildsPerDay} per day on ${plan.name}). Try again later or upgrade.`;
};

export const projectLimitMessage = (plan: Plan) => {
  if (plan.id === "PRO") {
    return `You can have ${plan.projects} projects on the Pro plan.`;
  }
  return `You can have ${plan.projects} projects on the Free plan. Upgrade to Pro for ${PRO.projects} projects.`;
};

export const appLimitMessage = (limit: number) => {
  return `This project can have ${limit} apps.`;
};

export const SUSPENDED_ERROR = "This app is paused because the project is over its plan limits. Check the Subscription page.";

const suspendApp = async (app: App) => {
  await stopContainer(containerName(app.slug)).catch((error) => console.error("[billing] stop failed", app.slug, error));
  await prisma.app.update({ where: { id: app.id }, data: { suspended: true, status: "STOPPED" } });
};

const resumeApp = async (app: App) => {
  await prisma.app.update({ where: { id: app.id }, data: { suspended: false } });
  try {
    if (app.kind === "AI") {
      await startAiApp({ ...app, suspended: false });
      return;
    }
    if (app.containerId) {
      await startContainer(containerName(app.slug));
      await prisma.app.update({ where: { id: app.id }, data: { status: "RUNNING" } });
    }
  } catch (error) {
    console.error("[billing] resume failed", app.slug, error);
  }
};

type EnforceOptions = { quotas: boolean };

export const enforceUser = async (userId: string, options: EnforceOptions) => {
  const [plan, projects] = await Promise.all([userPlan(userId), ownedProjects(userId)]);
  const dbNames = projects.flatMap((project) => {
    if (project.database) {
      return [project.database.dbName];
    }
    return [];
  });
  const sizes = await databaseSizes(dbNames);

  for (const [index, project] of projects.entries()) {
    const allowed = index < plan.projects;

    let dbOver = false;
    if (project.database) {
      dbOver = (sizes.get(project.database.dbName) ?? 0) > plan.dbBytes;
      const block = dbOver || !allowed;
      if (block !== project.database.blocked) {
        await setRoleLogin(project.database.roleName, !block);
        await prisma.database.update({ where: { id: project.database.id }, data: { blocked: block } });
      }
    }

    if (project.bucket && options.quotas) {
      await setBucketQuota(project.bucket.minioName, plan.storageBytes).catch((error) => {
        console.error("[billing] bucket quota failed", project.bucket?.minioName, error);
      });
    }

    let appLimit = plan.apps;
    if (!allowed || dbOver) {
      appLimit = 0;
    }
    const apps = await prisma.app.findMany({ where: projectAppsWhere(project.id), orderBy: { createdAt: "asc" } });
    for (const [position, app] of apps.entries()) {
      const shouldSuspend = position >= appLimit;
      if (shouldSuspend && !app.suspended) {
        await suspendApp(app);
      }
      if (!shouldSuspend && app.suspended) {
        await resumeApp(app);
      }
    }
  }
};

export const enforceProject = async (projectId: string, options: EnforceOptions) => {
  const project = await prisma.app.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (project) {
    await enforceUser(project.userId, options);
  }
};

export const billingOverview = async (userId: string) => {
  const [subscription, projects, account] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    ownedProjects(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tokenBalance: true } }),
  ]);
  let plan = FREE;
  if (isSubscriptionActive(subscription)) {
    plan = PRO;
  }
  const sizes = await databaseSizes(
    projects.flatMap((project) => {
      if (project.database) {
        return [project.database.dbName];
      }
      return [];
    }),
  );
  const items = await Promise.all(
    projects.map(async (project, index) => {
      let dbBytes = 0;
      if (project.database) {
        dbBytes = sizes.get(project.database.dbName) ?? 0;
      }
      let storageBytes = 0;
      if (project.bucket) {
        storageBytes = await bucketSize(project.bucket.minioName);
      }
      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        allowed: index < plan.projects,
        usage: {
          apps: await prisma.app.count({ where: projectAppsWhere(project.id) }),
          dbBytes,
          storageBytes,
        },
      };
    }),
  );
  return {
    plan,
    plans: { free: FREE, pro: PRO },
    subscription: subscription && {
      status: subscription.status,
      renewsAt: subscription.renewsAt,
      endsAt: subscription.endsAt,
    },
    tokenBalance: account.tokenBalance,
    projects: items,
  };
};

export const startCheckout = async (user: { id: string; email: string }) => {
  const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (isSubscriptionActive(subscription) || subscription?.status === "PAST_DUE") {
    return { error: "You already have a subscription. Use Manage billing to change it." } as const;
  }
  const checkout = await payments.createSubscriptionCheckout(user, `${env.appUrl}/subscription`);
  if (!checkout) {
    return { error: "Could not start checkout. Try again." } as const;
  }
  return { url: checkout.url } as const;
};

export const billingPortalUrl = async (userId: string) => {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    return null;
  }
  const fresh = await payments.fetchSubscription(subscription.providerSubscriptionId);
  if (!fresh) {
    return subscription.portalUrl;
  }
  await prisma.subscription.update({ where: { id: subscription.id }, data: subscriptionData(fresh) });
  return fresh.portalUrl;
};

const subscriptionData = (subscription: ProviderSubscription) => {
  return {
    status: subscription.status,
    renewsAt: subscription.renewsAt,
    endsAt: subscription.endsAt,
    portalUrl: subscription.portalUrl,
  };
};

const topUpTokens = async (userId: string) => {
  await prisma.user.updateMany({ where: { id: userId, tokenBalance: { lt: PRO.monthlyTokens } }, data: { tokenBalance: PRO.monthlyTokens } });
};

const recordBillingEvent = async (data: { userId: string; providerSubscriptionId: string; type: BillingEventType; paymentId?: string; amountCents?: number }) => {
  try {
    await prisma.billingEvent.create({
      data: { userId: data.userId, providerSubscriptionId: data.providerSubscriptionId, type: data.type, paymentId: data.paymentId ?? null, amountCents: data.amountCents ?? 0 },
    });
  } catch (error) {
    console.error("[billing] failed to record billing event", error);
  }
};

const statusChangeEvent = (from: SubscriptionStatus, to: SubscriptionStatus): BillingEventType | null => {
  if (from === to) {
    return null;
  }
  if (to === "CANCELLED") {
    return "CANCELLED";
  }
  if (to === "EXPIRED") {
    return "EXPIRED";
  }
  if (to === "PAST_DUE") {
    return "PAYMENT_FAILED";
  }
  return "REACTIVATED";
};

export const handlePaymentEvent = async (event: PaymentEvent) => {
  if (event.type === "ignored") {
    return;
  }

  if (event.type === "subscription.created") {
    if (!event.userId) {
      console.error("[billing] subscription without user id", event.subscription.providerSubscriptionId);
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: event.userId }, select: { id: true } });
    if (!user) {
      console.error("[billing] subscription for unknown user", event.userId);
      return;
    }
    const existing = await prisma.subscription.findUnique({ where: { providerSubscriptionId: event.subscription.providerSubscriptionId } });
    if (existing) {
      return;
    }
    const data = {
      provider: payments.name,
      providerSubscriptionId: event.subscription.providerSubscriptionId,
      ...subscriptionData(event.subscription),
      lastPaymentId: null,
    };
    await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    await recordBillingEvent({ userId: user.id, providerSubscriptionId: data.providerSubscriptionId, type: "CREATED", amountCents: PRO.price * 100 });
    await topUpTokens(user.id);
    await enforceUser(user.id, { quotas: true });
    return;
  }

  if (event.type === "subscription.updated") {
    const existing = await prisma.subscription.findUnique({ where: { providerSubscriptionId: event.subscription.providerSubscriptionId } });
    if (!existing) {
      return;
    }
    await prisma.subscription.update({ where: { id: existing.id }, data: subscriptionData(event.subscription) });
    const change = statusChangeEvent(existing.status, event.subscription.status);
    if (change) {
      await recordBillingEvent({ userId: existing.userId, providerSubscriptionId: existing.providerSubscriptionId, type: change });
    }
    await enforceUser(existing.userId, { quotas: true });
    return;
  }

  if (event.type === "subscription.renewed") {
    const existing = await prisma.subscription.findUnique({ where: { providerSubscriptionId: event.providerSubscriptionId } });
    if (!existing || existing.lastPaymentId === event.paymentId) {
      return;
    }
    const { count } = await prisma.subscription.updateMany({
      where: { id: existing.id, OR: [{ lastPaymentId: null }, { lastPaymentId: { not: event.paymentId } }] },
      data: { lastPaymentId: event.paymentId, status: "ACTIVE" },
    });
    if (!count) {
      return;
    }
    await recordBillingEvent({
      userId: existing.userId,
      providerSubscriptionId: existing.providerSubscriptionId,
      type: "RENEWED",
      paymentId: event.paymentId,
      amountCents: PRO.price * 100,
    });
    await topUpTokens(existing.userId);
    const fresh = await payments.fetchSubscription(existing.providerSubscriptionId);
    if (fresh) {
      await prisma.subscription.update({ where: { id: existing.id }, data: subscriptionData(fresh) });
    }
    await enforceUser(existing.userId, { quotas: true });
    return;
  }

  const existing = await prisma.subscription.findUnique({ where: { providerSubscriptionId: event.providerSubscriptionId } });
  if (!existing) {
    return;
  }
  await prisma.subscription.update({ where: { id: existing.id }, data: { status: "PAST_DUE" } });
  if (existing.status !== "PAST_DUE") {
    await recordBillingEvent({ userId: existing.userId, providerSubscriptionId: existing.providerSubscriptionId, type: "PAYMENT_FAILED" });
  }
  await enforceUser(existing.userId, { quotas: true });
};

const runWorker = async (quotas: boolean) => {
  const users = await prisma.app.findMany({
    where: { parentProjectId: null, deleting: false },
    distinct: ["userId"],
    select: { userId: true },
  });
  for (const { userId } of users) {
    await enforceUser(userId, { quotas }).catch((error) => console.error("[billing] enforce failed", userId, error));
  }
};

export const startBillingWorker = () => {
  let running = false;
  let firstRun = true;
  const tick = () => {
    if (running) {
      return;
    }
    running = true;
    const quotas = firstRun;
    firstRun = false;
    runWorker(quotas)
      .catch((error) => console.error("[billing] worker failed", error))
      .finally(() => {
        running = false;
      });
  };
  tick();
  setInterval(tick, WORKER_INTERVAL_MS);
};
