import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { LIMITS } from "../lib/limits.js";
import { validate } from "../lib/validator.js";
import { scheduleSchema, scheduleStateSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import { requireProject } from "../middleware/require-project.js";
import type { UserEnv } from "../lib/types.js";

export const scheduleRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/", async (c) => {
    const schedules = await prisma.schedule.findMany({
      where: { projectId: c.get("projectId") },
      orderBy: { createdAt: "asc" },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 10 } },
    });
    return c.json({ schedules, limit: LIMITS.schedules });
  })
  .post("/", validate("json", scheduleSchema), async (c) => {
    const projectId = c.get("projectId");
    const payload = c.req.valid("json");
    const schedule = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM apps WHERE id = ${projectId} FOR UPDATE`;
      const project = await tx.app.findUnique({ where: { id: projectId } });
      if (!project || project.deleting) {
        return null;
      }
      const count = await tx.schedule.count({ where: { projectId } });
      if (count >= LIMITS.schedules) {
        return null;
      }
      return tx.schedule.create({ data: { ...payload, projectId, nextRunAt: new Date(Date.now() + payload.intervalMinutes * 60_000) } });
    });
    if (!schedule) {
      return c.json({ error: `Each project can have at most ${LIMITS.schedules} schedules.` }, 400);
    }
    return c.json({ schedule }, 201);
  })
  .put("/:id", validate("json", scheduleSchema), async (c) => {
    const payload = c.req.valid("json");
    const result = await prisma.schedule.updateMany({
      where: { id: c.req.param("id"), projectId: c.get("projectId") },
      data: { ...payload, nextRunAt: new Date(Date.now() + payload.intervalMinutes * 60_000) },
    });
    if (!result.count) {
      return c.json({ error: "Schedule not found" }, 404);
    }
    return c.json({ message: "Schedule updated" });
  })
  .patch("/:id", validate("json", scheduleStateSchema), async (c) => {
    const { enabled } = c.req.valid("json");
    const schedule = await prisma.schedule.findFirst({ where: { id: c.req.param("id"), projectId: c.get("projectId") } });
    if (!schedule) {
      return c.json({ error: "Schedule not found" }, 404);
    }
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: { enabled, ...(enabled ? { nextRunAt: new Date(Date.now() + schedule.intervalMinutes * 60_000) } : {}) },
    });
    return c.json({ message: enabled ? "Schedule resumed" : "Schedule paused" });
  })
  .delete("/:id", async (c) => {
    const result = await prisma.schedule.deleteMany({ where: { id: c.req.param("id"), projectId: c.get("projectId") } });
    if (!result.count) {
      return c.json({ error: "Schedule not found" }, 404);
    }
    return c.json({ message: "Schedule deleted" });
  });
