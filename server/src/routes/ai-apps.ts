import { Hono } from "hono";
import { zipSync } from "fflate";
import { streamSSE } from "hono/streaming";
import { liveSession, subscribeLive, type AiLiveEvent, type AiStep } from "../lib/ai-live.js";
import { prisma } from "../lib/prisma.js";
import { LIMITS } from "../lib/limits.js";
import { SUSPENDED_ERROR, appLimitMessage, projectEntitlement } from "../lib/billing.js";
import { validate } from "../lib/validator.js";
import { aiAppAvailabilitySchema, aiAppNameSchema, aiFileQuerySchema, aiPromptSchema, aiWriteFileSchema, aiRespondSchema, createAiAppSchema, type AiElement } from "../lib/validations.js";
import { AI_THEMES, findTheme, themeCss } from "../lib/ai-themes.js";
import { projectAppsWhere, withAppUrl } from "../lib/project-apps.js";
import { appUrl } from "../lib/domains.js";
import { env } from "../lib/env.js";
import { AiFileError, aiPreviewUrl, generateAuthSecret, isAiAssetPath, listAiFiles, readAiAsset, readAiFile, readAllAiFileBytes, saveAiAsset, startAiApp, writeAiFile } from "../lib/ai-apps.js";
import { starterFiles } from "../lib/ai-template.js";
import { startGeneration } from "../lib/ai-agent.js";
import { MIN_TOKENS_TO_BUILD, OUT_OF_TOKENS, billingForRun } from "../lib/tokens.js";
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
    const userId = c.get("user").id;
    const entitlement = await projectEntitlement(projectId);
    const app = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM apps WHERE id = ${projectId} FOR UPDATE`;
      const project = await tx.app.findUnique({ where: { id: projectId } });
      if (!project || project.deleting) {
        return null;
      }
      const count = await tx.app.count({ where: projectAppsWhere(projectId) });
      if (count >= entitlement.limits.apps) {
        return null;
      }
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const account = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { freeAiAppUsed: true, tokenBalance: true } });
      if (!account.freeAiAppUsed) {
        await tx.user.update({ where: { id: userId }, data: { freeAiAppUsed: true } });
      } else if (account.tokenBalance < MIN_TOKENS_TO_BUILD) {
        return "tokens" as const;
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
    if (app === "tokens") {
      return c.json({ error: "Your free AI app is used. Upgrade to Pro on the Subscription page to create more AI apps." }, 402);
    }
    if (!app) {
      return c.json({ error: appLimitMessage(entitlement.limits.apps) }, 400);
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
        select: { id: true, role: true, content: true, steps: true, elements: true, attachments: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      listAiFiles(app.id),
    ]);
    const summary = await prisma.app.findUniqueOrThrow({ where: { id: app.id }, select: aiAppSummary });
    return c.json({
      app: { ...withAppUrl(summary), steps: summary.aiSteps as AiStep[] },
      previewUrl: await aiPreviewUrl(app),
      themes: AI_THEMES,
      messages: messages.map((message) => ({ ...message, steps: message.steps as AiStep[], elements: message.elements as AiElement[], attachments: message.attachments as string[] })),
      files,
    });
  })
  .get("/:id/file", validate("query", aiFileQuerySchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    if (isAiAssetPath(c.req.valid("query").path)) {
      return c.json({ error: "Uploaded images cannot be opened as text" }, 400);
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
  .put("/:id/file", validate("json", aiWriteFileSchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    if (app.aiStatus === "GENERATING") {
      return c.json({ error: "Wait for the AI to finish before editing files" }, 409);
    }
    const { path, content } = c.req.valid("json");
    try {
      const saved = await writeAiFile(app, path, content);
      return c.json({ path: saved });
    } catch (error) {
      if (error instanceof AiFileError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  })
  .post("/:id/assets", async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }
    try {
      const asset = await saveAiAsset(app, file);
      return c.json({ asset }, 201);
    } catch (error) {
      if (error instanceof AiFileError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  })
  .get("/:id/asset", validate("query", aiFileQuerySchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    try {
      const asset = await readAiAsset(app.id, c.req.valid("query").path);
      return c.body(new Uint8Array(asset.content), 200, {
        "Content-Type": asset.contentType,
        "Cache-Control": "private, max-age=300",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
      });
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
  .get("/:id/export", async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    const files = await readAllAiFileBytes(app.id);
    const entries: Record<string, Uint8Array> = {};
    for (const file of files) {
      entries[`${app.slug}/${file.path}`] = new Uint8Array(file.content);
    }
    const zip = zipSync(entries, { level: 6 });
    return c.body(zip, 200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${app.slug}.zip"`,
      "Cache-Control": "no-store",
    });
  })
  .post("/:id/prompt", validate("json", aiPromptSchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    if (app.suspended) {
      return c.json({ error: SUSPENDED_ERROR }, 402);
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

    const billing = await billingForRun(c.get("user").id);
    if (!billing) {
      return c.json({ error: OUT_OF_TOKENS }, 402);
    }

    const { count } = await prisma.app.updateMany({
      where: { id: app.id, aiStatus: { not: "GENERATING" } },
      data: { aiStatus: "GENERATING", aiProgress: "Starting", aiError: null, aiSteps: [] },
    });
    if (!count) {
      return c.json({ error: "The AI is still working on the previous request" }, 409);
    }
    const message = await prisma.aiMessage.create({
      data: { appId: app.id, role: "user", content: c.req.valid("json").prompt, elements: c.req.valid("json").elements, attachments: c.req.valid("json").attachments },
      select: { id: true, role: true, content: true, steps: true, elements: true, attachments: true, createdAt: true },
    });
    startGeneration(app.id, billing);
    return c.json({ message }, 202);
  })
  .post("/:id/respond", validate("json", aiRespondSchema), async (c) => {
    const app = await findAiApp(c.get("projectId"), c.req.param("id"));
    if (!app) {
      return c.json({ error: "AI app not found" }, 404);
    }
    if (app.suspended) {
      return c.json({ error: SUSPENDED_ERROR }, 402);
    }
    const body = c.req.valid("json");
    const message = await prisma.aiMessage.findFirst({
      where: { appId: app.id, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    const steps = (message?.steps ?? []) as AiStep[];
    const step = steps.find((item) => item.id === body.stepId);
    if (!message || !step || (step.type !== "questions" && step.type !== "plan" && step.type !== "theme")) {
      return c.json({ error: "This card can no longer be answered" }, 400);
    }

    let updated: AiStep = step;
    let reply = "";
    if (step.type === "questions") {
      if (step.answers || !body.answers) {
        return c.json({ error: "These questions were already answered" }, 400);
      }
      const answers: Record<string, string> = {};
      for (const question of step.questions) {
        answers[question.id] = body.answers[question.id]?.trim() || "No preference";
      }
      updated = { ...step, answers };
      reply = ["Answers:", ...step.questions.map((question) => `- ${question.text} ${answers[question.id]}`)].join("\n");
    } else if (step.type === "plan") {
      if (step.status !== "pending" || !body.approve) {
        return c.json({ error: "This plan was already handled" }, 400);
      }
      updated = { ...step, status: "approved" };
      reply = "Plan approved.";
      if (!step.frontend) {
        reply = "Plan approved. No frontend, so skip the theme and build it now.";
      }
    } else {
      const theme = findTheme(body.theme);
      if (step.chosen || !theme) {
        return c.json({ error: "Choose one of the listed themes" }, 400);
      }
      updated = { ...step, chosen: theme.id };
      reply = `Theme: ${theme.name}. Build it now.`;
    }

    const billing = await billingForRun(c.get("user").id);
    if (!billing) {
      return c.json({ error: OUT_OF_TOKENS }, 402);
    }

    const { count } = await prisma.app.updateMany({
      where: { id: app.id, aiStatus: { not: "GENERATING" } },
      data: { aiStatus: "GENERATING", aiProgress: "Starting", aiError: null, aiSteps: [] },
    });
    if (!count) {
      return c.json({ error: "The AI is still working on the previous request" }, 409);
    }
    if (updated.type === "theme" && updated.chosen) {
      const theme = findTheme(updated.chosen);
      if (theme) {
        await prisma.app.update({ where: { id: app.id }, data: { aiTheme: theme.id } });
        await writeAiFile(app, "public/theme.css", themeCss(theme));
      }
    }
    await prisma.aiMessage.update({
      where: { id: message.id },
      data: {
        steps: steps.map((item) => {
          if (item.id === updated.id) {
            return updated;
          }
          return item;
        }),
      },
    });
    await prisma.aiMessage.create({ data: { appId: app.id, role: "user", content: reply } });
    startGeneration(app.id, billing);
    return c.json({ ok: true });
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
