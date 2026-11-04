import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { liveSession, subscribeLive, type AiLiveEvent, type AiStep } from "../lib/ai-live.js";
import { prisma } from "../lib/prisma.js";
import { LIMITS } from "../lib/limits.js";
import { validate } from "../lib/validator.js";
import { aiAppAvailabilitySchema, aiAppNameSchema, aiFileQuerySchema, aiPromptSchema, createAiAppSchema } from "../lib/validations.js";
import { projectAppsWhere, withAppUrl } from "../lib/project-apps.js";
import { appUrl } from "../lib/domains.js";
import { env } from "../lib/env.js";
import { AiFileError, aiPreviewUrl, generateAuthSecret, listAiFiles, readAiFile, startAiApp, writeAiFile } from "../lib/ai-apps.js";
import { starterFiles } from "../lib/ai-template.js";
import { startGeneration } from "../lib/ai-agent.js";
import { requireUser } from "../middleware/require-user.js";
import { requireProject } from "../middleware/require-project.js";
import type { UserEnv } from "../lib/types.js";

const aiAppSummary = {
  id: true,
  name: true,
  appName: true,
  slug: true,
  parentProjectId: true,
  status: true,
  aiStatus: true,
  aiProgress: true,
  aiError: true,
  aiSteps: true,
  createdAt: true,
  updatedAt: true,
} as const;

const findAiApp = (projectId: string, idOrSlug: string) => prisma.app.findFirst({
  where: { kind: "AI", AND: [projectAppsWhere(projectId), { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }] },
});

const nameAvailability = async (input: string) => {
  const parsed = aiAppNameSchema.safeParse(input);
  if (!parsed.success) {
    return { name: input, url: null, available: false, reason: parsed.error.issues[0]?.message ?? "Invalid name" };
  }
  const taken = await prisma.app.findUnique({ where: { slug: parsed.data }, select: { id: true } });
  if (taken) {
    return { name: parsed.data, url: appUrl(parsed.data), available: false, reason: `${parsed.data} is already taken` };
  }
  return { name: parsed.data, url: appUrl(parsed.data), available: true, reason: null };
};

export const aiAppRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/", async (c) => {
    const apps = await prisma.app.findMany({
      where: { kind: "AI", ...projectAppsWhere(c.get("projectId")) },
      select: aiAppSummary,
      orderBy: { createdAt: "desc" },
    });
    return c.json({ apps: apps.map(withAppUrl), domain: env.appsDomain });
  })
  .get("/availability", validate("query", aiAppAvailabilitySchema), async (c) => {
    return c.json(await nameAvailability(c.req.valid("query").name));
  })
  .post("/", validate("json", createAiAppSchema), async (c) => {
    const { name } = c.req.valid("json");
    const availability = await nameAvailability(name);
    if (!availability.available) {
      return c.json({ error: availability.reason ?? "This name is not available" }, 400);
    }

    const projectId = c.get("projectId");
    const app = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM apps WHERE id = ${projectId} FOR UPDATE`;
      const project = await tx.app.findUnique({ where: { id: projectId } });
      if (!project || project.deleting) {
        return null;
      }
      const count = await tx.app.count({ where: { appEnabled: true, OR: [{ id: projectId }, { parentProjectId: projectId }] } });
      if (count >= LIMITS.apps) {
        return null;
      }
      return tx.app.create({
        data: {
          userId: project.userId,
          parentProjectId: projectId,
          name,
          appName: name,
          slug: name,
          kind: "AI",
          aiAuthSecret: generateAuthSecret(),
        },
      });
    }).catch((error) => {
      if ((error as { code?: string }).code === "P2002") {
        return "taken" as const;
      }
      throw error;
    });
    if (app === "taken") {
      return c.json({ error: `${name} is already taken` }, 400);
    }
    if (!app) {
      return c.json({ error: `Each project can have at most ${LIMITS.apps} apps.` }, 400);
    }

    for (const file of starterFiles()) {
      await writeAiFile(app, file.path, file.content);
    }
    try {
      await startAiApp(app);
    } catch (error) {
      console.error("Failed to start AI app container", error);
      await prisma.app.update({ where: { id: app.id }, data: { status: "FAILED" } });
    }
    const created = await prisma.app.findUniqueOrThrow({ where: { id: app.id }, select: aiAppSummary });
    return c.json({ app: withAppUrl(created) }, 201);
  })
  .get("/:id", async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    const [messages, files] = await Promise.all([
      prisma.aiMessage.findMany({
        where: { appId: app.id },
        select: { id: true, role: true, content: true, steps: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      listAiFiles(app.id),
    ]);
    const summary = await prisma.app.findUniqueOrThrow({ where: { id: app.id }, select: aiAppSummary });
    return c.json({
      app: { ...withAppUrl(summary), steps: summary.aiSteps as AiStep[] },
      previewUrl: await aiPreviewUrl(app),
      messages: messages.map((message) => ({ ...message, steps: message.steps as AiStep[] })),
      files,
    });
  })
  .get("/:id/file", validate("query", aiFileQuerySchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    try {
      const content = await readAiFile(app.id, c.req.valid("query").path);
      return c.json({ path: c.req.valid("query").path, content });
    } catch (error) {
      if (error instanceof AiFileError) {
        return c.json({ error: error.message }, 400);
      }
      if ((error as { code?: string }).code === "NoSuchKey") {
        return c.json({ error: "File not found" }, 404);
      }
      throw error;
    }
  })
  .post("/:id/prompt", validate("json", aiPromptSchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }

    const projectId = c.get("projectId");
    const used = await prisma.aiMessage.count({
      where: {
        role: "user",
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        app: { OR: [{ id: projectId }, { parentProjectId: projectId }] },
      },
    });
    if (used >= LIMITS.aiPromptsPerDay) {
      return c.json({ error: `Each project can send at most ${LIMITS.aiPromptsPerDay} AI prompts per day.` }, 429);
    }

    const { count } = await prisma.app.updateMany({
      where: { id: app.id, aiStatus: { not: "GENERATING" } },
      data: { aiStatus: "GENERATING", aiProgress: "Starting", aiError: null, aiSteps: [] },
    });
    if (!count) {
      return c.json({ error: "The AI is still working on the previous request" }, 409);
    }
    const message = await prisma.aiMessage.create({
      data: { appId: app.id, role: "user", content: c.req.valid("json").prompt },
      select: { id: true, role: true, content: true, steps: true, createdAt: true },
    });
    startGeneration(app.id);
    return c.json({ message }, 202);
  })
  .get("/:id/events", async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    c.header("X-Accel-Buffering", "no");
    return streamSSE(c, async (stream) => {
      const send = (event: AiLiveEvent | { type: "snapshot"; steps: unknown[]; generating: boolean }) => {
        return stream.writeSSE({ data: JSON.stringify(event) });
      };
      let finished = false;
      const queue: AiLiveEvent[] = [];
      let wake: (() => void) | null = null;
      const unsubscribe = subscribeLive(app.id, (event) => {
        queue.push(event);
        wake?.();
      });
      const session = liveSession(app.id);
      await send({ type: "snapshot", steps: session?.steps ?? [], generating: !!unsubscribe });
      if (!unsubscribe) {
        return;
      }
      stream.onAbort(() => {
        finished = true;
        wake?.();
      });
      try {
        while (!finished) {
          if (!queue.length) {
            await new Promise<void>((resolve) => {
              wake = resolve;
              setTimeout(resolve, 15_000);
            });
            wake = null;
            if (!queue.length && !finished) {
              await stream.writeSSE({ event: "ping", data: "" });
            }
            continue;
          }
          const event = queue.shift() as AiLiveEvent;
          await send(event);
          if (event.type === "done") {
            finished = true;
          }
        }
      } finally {
        unsubscribe?.();
      }
    });
  });
