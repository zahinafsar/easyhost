import { prisma } from "./prisma.js";
import { appUrl } from "./domains.js";
import { isReservedAppName } from "./validations.js";

export const resourceSlug = (name: string) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 31).replace(/-$/, "");
  const base = slug && !isReservedAppName(slug) ? slug : "project";
  return `${base}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
};

export const projectAppsWhere = (projectId: string) => ({
  appEnabled: true,
  deleting: false,
  OR: [{ id: projectId }, { parentProjectId: projectId }],
});

export const findProjectApp = (userId: string, projectId: string, idOrSlug: string) => prisma.app.findFirst({
  where: {
    userId,
    AND: [projectAppsWhere(projectId), { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }],
  },
});

export const withAppUrl = <T extends { id: string; slug: string; name: string; appName: string | null; parentProjectId: string | null }>(app: T) => ({
  ...app,
  name: app.appName ?? app.name,
  projectId: app.parentProjectId ?? app.id,
  url: appUrl(app.slug),
});

export const projectSummary = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} as const;
