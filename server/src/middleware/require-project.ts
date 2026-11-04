import { createMiddleware } from "hono/factory";
import { prisma } from "../lib/prisma.js";
import { projectAccessWhere } from "../lib/project-apps.js";
import type { UserEnv } from "../lib/types.js";

export const requireProject = createMiddleware<UserEnv>(async (c, next) => {
  const requestedId = c.req.header("x-project-id") ?? c.req.query("projectId");
  const project = await prisma.app.findFirst({
    where: {
      ...projectAccessWhere(c.get("user").id),
      ...(requestedId ? { id: requestedId } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true },
  });

  if (!project) {
    return c.json({ error: requestedId ? "Project not found" : "Create a project first" }, requestedId ? 404 : 409);
  }

  c.set("projectId", project.id);
  c.set("projectOwnerId", project.userId);
  await next();
});
