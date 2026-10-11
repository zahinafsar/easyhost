import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { LIMITS } from "../lib/limits.js";
import { projectSummary, resourceSlug } from "../lib/project-apps.js";
import { deleteProject } from "../lib/delete-project.js";
import { validate } from "../lib/validator.js";
import { createAppSchema, updateProjectSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

const findProject = (userId: string, idOrSlug: string) => prisma.app.findFirst({
  where: { userId, parentProjectId: null, deleting: false, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  select: projectSummary,
});

export const projectRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const projects = await prisma.app.findMany({
      where: { userId: c.get("user").id, parentProjectId: null, deleting: false },
      select: { ...projectSummary, appEnabled: true, projectApps: { where: { appEnabled: true, deleting: false }, select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });
    return c.json({ projects: projects.map(({ appEnabled, projectApps, ...project }) => ({ ...project, appIds: [...(appEnabled ? [project.id] : []), ...projectApps.map((app) => app.id)] })), limit: LIMITS.projects });
  })
  .post("/", validate("json", createAppSchema), async (c) => {
    const userId = c.get("user").id;
    const { name } = c.req.valid("json");
    const project = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const count = await tx.app.count({ where: { userId, parentProjectId: null } });
      if (count >= LIMITS.projects) {
        return null;
      }
      return tx.app.create({ data: { userId, name, slug: resourceSlug(name), appEnabled: false }, select: projectSummary });
    });
    if (!project) {
      return c.json({ error: `You can have at most ${LIMITS.projects} projects.` }, 400);
    }
    return c.json({ project }, 201);
  })
  .get("/:id", async (c) => {
    const project = await findProject(c.get("user").id, c.req.param("id"));
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json({ project });
  })
  .put("/:id", validate("json", updateProjectSchema), async (c) => {
    const project = await findProject(c.get("user").id, c.req.param("id"));
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    const data = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM apps WHERE id = ${project.id} FOR UPDATE`;
      const current = await tx.app.findUnique({ where: { id: project.id } });
      if (!current || current.deleting) {
        return null;
      }
      return tx.app.update({
        where: { id: project.id },
        data: { ...c.req.valid("json"), ...(current.appEnabled && !current.appName ? { appName: current.name } : {}) },
        select: projectSummary,
      });
    });
    if (!data) {
      return c.json({ error: "Project not found" }, 404);
    }
    return c.json({ project: data });
  })
  .delete("/:id", async (c) => {
    const project = await findProject(c.get("user").id, c.req.param("id"));
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }
    const result = await deleteProject(project);
    if (!result.ok) {
      return c.json({ error: result.error }, 409);
    }
    return c.json({ message: "Project deleted" });
  });
