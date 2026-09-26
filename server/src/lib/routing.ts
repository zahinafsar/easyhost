import { prisma } from "./prisma.js";
import { upsertAppRoute, hasAppRoute } from "./caddy.js";
import { APP_PORT, containerName } from "./docker.js";

export const routeApp = async (appId: string) => {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: { domains: { where: { status: "ACTIVE" }, select: { hostname: true } } },
  });
  if (!app) {
    return;
  }
  await upsertAppRoute(
    app.slug,
    `${containerName(app.slug)}:${APP_PORT}`,
    app.domains.map((domain) => domain.hostname),
  );
};

export const syncAppRoutes = async () => {
  const apps = await prisma.app.findMany({ where: { status: "RUNNING" }, select: { id: true, slug: true } });
  for (const app of apps) {
    if (!(await hasAppRoute(app.slug))) {
      await routeApp(app.id);
    }
  }
};
