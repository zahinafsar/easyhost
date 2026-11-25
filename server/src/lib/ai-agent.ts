import type { AiElement } from "./validations.js";
import { ToolLoopAgent, isStepCount, tool, type ModelMessage, type StepResult, type ToolResultPart, type ToolSet } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { App } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { containerLogs, containerName } from "./docker.js";
import { aiAssetUrl, connectedServices, connectProjectDatabase, connectProjectStorage, installAiPackages, isAiAssetPath, listAiFiles, verifyDatabase } from "./ai-apps.js";
import { createWorkspace } from "./ai-workspace.js";
import { runQuery } from "./userdb.js";
import { endLiveSession, liveSession, startLiveSession, upsertStep, type AiInteractiveStep, type AiTextStep, type AiToolStep } from "./ai-live.js";
import { findTheme, themeSummary } from "./ai-themes.js";
import { OUT_OF_TOKENS, addUsage, emptyUsage, markFreeBuildUsed, recordUsage, tokensForUsage, type RunBilling } from "./tokens.js";

const MODEL_ID = "gemini-3.8-flash";
const MAX_STEPS = 40;
const HISTORY_MESSAGES = 20;
const MAX_TOOL_OUTPUT = 20_000;
const LOG_SETTLE_MS = 1500;

const google = createGoogleGenerativeAI({ apiKey: env.googleAiApiKey });

const INSTRUCTIONS = `You build and edit full-stack web apps hosted on Reverhost. You change the app only by calling tools.

When to change the app:
- Only call tools when the user asks you to build, change, fix or remove something.
- For greetings, questions, or anything unclear, reply in plain text without calling any tool. If a request is vague, ask a short question or suggest what you could build instead of guessing.
- Change only what the request needs. Do not rewrite, restore or tidy up files the user did not ask about.
- Never add features, pages or content the user did not ask for. Keep apps simple.

Planning (for a new app or a big new feature only; small edits and fixes go straight to code):
1. If key details are unclear, call ask_questions with at most 3 short questions, each with 2 to 4 short options, then stop. Skip this when the request is clear.
2. Call propose_plan with a one-sentence summary and at most 6 short items describing only what was asked, then stop and wait for approval.
3. After the plan is approved, if no theme is chosen yet (see the Theme line in the request), call choose_theme and stop. If the user asks to change the theme later, call choose_theme again.
4. Once the plan is approved and a theme is chosen, build it.

Runtime:
- Node.js 22, plain JavaScript ES modules (no TypeScript, no build step). The entry file is server.js and is started with node --watch, so every file change restarts the server within a second.
- server.js must start an HTTP server on process.env.PORT bound to 0.0.0.0. Use Hono with @hono/node-server. Serve the frontend from ./public with serveStatic from "@hono/node-server/serve-static". Put backend routes under /api/*.
- Preinstalled packages you can import without installing: hono, @hono/node-server, pg, bcryptjs, jose, zod, @aws-sdk/client-s3.
- For any other npm package, call install_packages before writing code that imports it. Never add dependencies to package.json by hand. Packages that compile native code on install are not supported; prefer pure JavaScript packages. package.json must keep "type": "module".
- Environment (already set): DATABASE_URL, AUTH_SECRET, S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL, plus any variables the user configured.
- Frontend: plain HTML, CSS and JavaScript in public/. Load libraries from a CDN with pinned versions if needed. Make pages responsive, clean and polished.
- Styling: every page links /theme.css and uses only its CSS variables for colors, corner radius and font. Never overwrite public/theme.css.
- Icons: always use Lucide. Load <script src="https://unpkg.com/lucide@1.68.0/dist/umd/lucide.min.js"></script>, write icons as <i data-lucide="icon-name"></i> and call lucide.createIcons() after rendering. Never use emojis or arrow characters as icons.

Starter helpers (new apps start with a simple welcome page in public/index.html and these helper files; when they exist, reuse them instead of rewriting, and replace the welcome page with the user's app):
- lib/db.js: query(text, params) for parameterized SQL against DATABASE_URL.
- lib/auth.js: hashPassword, verifyPassword, startSession(c, userId), endSession(c), currentUser(c), and the requireUser middleware (sets c.get("user")). It expects a users table with id, name, email and password_hash columns; create it with run_sql before using auth.
- lib/storage.js: uploadFile(key, body, contentType) returns a public URL, listFiles(prefix), deleteFile(key). Files are public, so never store secrets there.
- If a helper is missing, only add it when a requested change needs it.

Errors:
- If a tool fails, read the error and fix the cause once. If the same tool fails again with the same error, stop calling tools and explain the problem and what the user can do. Never repeat a failing call unchanged.

Services:
- Each request lists which services are connected to this app (database, storage).
- Use a service whenever the request needs it, without asking the user.
- Database: just call run_sql. It connects the project's database automatically (creating it if needed) and sets DATABASE_URL.
- Storage: if storage is not connected, call connect_storage before writing code that uses it.
- Size limits: the project database holds 128 MB and storage holds 256 MB. Keep data lean: store files in storage, never as blobs in Postgres, and limit upload sizes.
- Sending email is not supported. If a request needs to send email, build everything else and tell the user email sending is not available. Never write code that sends email.

Uploaded images:
- The user can attach images. They are stored in public/uploads/ and served at /uploads/<name>. Each request lists the uploaded images and which ones the user attached to that message.
- You cannot see, read, describe, edit, crop, resize, convert, replace, delete or generate images. You only know each image's file name and URL. Never call write_file or delete_file on public/uploads/.
- Use uploaded images only as assets, for example <img src="/uploads/logo.png"> or a CSS background, exactly where the user asks.
- If the user asks you to edit, generate, read or describe an image, say you can only place their uploaded images as they are, then do any other part of the request.

Database:
- Use the run_sql tool to create or change tables. Never drop data unless the user asks.

Workflow:
- Each request lists the app's files with their sizes, not their contents. Read only the files the request needs with read_file, and use grep to find code instead of reading many files.
- Change existing files with edit_file: old_string must match the file exactly (copy it from read_file output without the line number prefix) and include enough surrounding lines to be unique. Prefer several small edits over rewriting a file.
- Use write_file only for new files or when most of a file changes. Never use placeholders such as "rest of the code unchanged".
- You must read a file with read_file in this request before editing or overwriting it. Do not read a file again after changing it unless an edit failed.
- Call independent tools together in one step, for example read several files at once or make edits to different files at once.
- After changing server code, call read_logs and fix any startup or runtime error you see before finishing.
- Finish with a short plain-language summary of what you built or changed. Do not paste code in the summary.`;

const elementsContext = (elements: AiElement[]) => {
  if (!elements.length) {
    return "";
  }
  const lines = elements.map((element, index) => {
    return `${index + 1}. <${element.tag}> on page ${element.page}\n   selector: ${element.selector}\n   text: ${element.text || "(none)"}\n   html: ${element.html}`;
  });
  return `\n\nThe user selected these elements in the preview. The request refers to them:\n${lines.join("\n")}`;
};

const attachmentsContext = (attachments: string[]) => {
  if (!attachments.length) {
    return "";
  }
  return `\n\nThe user attached these images to this message. Use them as assets by URL only:\n${attachments.map((item) => `- ${aiAssetUrl(item)}`).join("\n")}`;
};

const assetsContext = (assets: { path: string; size: number }[]) => {
  if (!assets.length) {
    return "Uploaded images: none.";
  }
  return `Uploaded images (assets only, never read or change them):\n${assets.map((asset) => `- ${aiAssetUrl(asset.path)} (${Math.ceil(asset.size / 1024)} KB)`).join("\n")}`;
};

const filesContext = (files: { path: string; size: number }[]) => {
  if (!files.length) {
    return "The app has no files yet.";
  }
  return files.map((file) => `- ${file.path} (${formatSize(file.size)})`).join("\n");
};

const formatSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }
  return `${(size / 1024).toFixed(1)} KB`;
};

const truncate = (value: string) => {
  if (value.length <= MAX_TOOL_OUTPUT) {
    return value;
  }
  return `${value.slice(0, MAX_TOOL_OUTPUT)}\n[truncated]`;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_DETAIL = 20_000;
const PERSIST_INTERVAL_MS = 1000;
const EMIT_INTERVAL_MS = 150;

const clip = (value: string) => {
  if (value.length <= MAX_DETAIL) {
    return value;
  }
  return `${value.slice(0, MAX_DETAIL)}\n[truncated]`;
};

const partialJsonString = (raw: string, key: string) => {
  const marker = raw.indexOf(`"${key}"`);
  if (marker === -1) {
    return null;
  }
  const open = raw.indexOf('"', raw.indexOf(":", marker) + 1);
  if (open === -1) {
    return null;
  }
  let end = open + 1;
  while (end < raw.length) {
    if (raw[end] === "\\") {
      end += 2;
      continue;
    }
    if (raw[end] === '"') {
      break;
    }
    end += 1;
  }
  let body = raw.slice(open + 1, Math.min(end, raw.length));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return JSON.parse(`"${body}"`) as string;
    } catch {
      body = body.slice(0, -1);
    }
  }
  return null;
};

const inputPath = (input: Record<string, unknown>) => {
  if (typeof input.path === "string") {
    return input.path;
  }
  return "";
};

const runningTitle = (tool: string, input: Record<string, unknown>) => {
  const path = inputPath(input);
  if (tool === "write_file") {
    return `Writing ${path || "file"}`;
  }
  if (tool === "edit_file") {
    return `Editing ${path || "file"}`;
  }
  if (tool === "read_file") {
    return `Reading ${path || "file"}`;
  }
  if (tool === "grep") {
    return "Searching files";
  }
  if (tool === "delete_file") {
    return `Deleting ${path || "file"}`;
  }
  if (tool === "run_sql") {
    return "Running SQL";
  }
  if (tool === "install_packages") {
    return "Installing packages";
  }
  if (tool === "read_logs") {
    return "Reading server logs";
  }
  if (tool === "connect_storage") {
    return "Connecting storage";
  }
  return tool;
};

const doneTitle = (tool: string, input: Record<string, unknown>) => {
  const path = inputPath(input);
  if (tool === "write_file") {
    return `Wrote ${path}`;
  }
  if (tool === "edit_file") {
    return `Edited ${path}`;
  }
  if (tool === "read_file") {
    return `Read ${path}`;
  }
  if (tool === "grep" && typeof input.pattern === "string") {
    return `Searched for ${input.pattern}`;
  }
  if (tool === "delete_file") {
    return `Deleted ${path}`;
  }
  if (tool === "run_sql") {
    return "Ran SQL";
  }
  if (tool === "install_packages" && Array.isArray(input.packages)) {
    return `Installed ${input.packages.join(", ")}`;
  }
  if (tool === "read_logs") {
    return "Read server logs";
  }
  if (tool === "connect_storage") {
    return "Connected storage";
  }
  return tool;
};

const stepDetail = (tool: string, input: Record<string, unknown>) => {
  if (tool === "write_file" && typeof input.content === "string") {
    return clip(input.content);
  }
  if (tool === "edit_file" && typeof input.new_string === "string") {
    return clip(input.new_string);
  }
  if (tool === "run_sql" && typeof input.sql === "string") {
    return clip(input.sql);
  }
  if (tool === "install_packages" && Array.isArray(input.packages)) {
    return `npm install ${input.packages.join(" ")}`;
  }
  return null;
};

const stepOutput = (tool: string, output: unknown) => {
  if (tool === "write_file" || tool === "edit_file" || tool === "delete_file" || tool === "read_file") {
    return null;
  }
  if (typeof output === "string") {
    return clip(output);
  }
  if (output && typeof output === "object" && "output" in output && typeof output.output === "string") {
    return clip(output.output);
  }
  return clip(JSON.stringify(output, null, 2));
};

const MAX_FAILED_STEPS = 3;

const stepFailed = (step: StepResult<ToolSet>) => {
  const errored = step.content.some((part) => part.type === "tool-error");
  const succeeded = step.content.some((part) => part.type === "tool-result");
  return errored && !succeeded;
};

const keepsFailing = ({ steps }: { steps: StepResult<ToolSet>[] }) => {
  return steps.length >= MAX_FAILED_STEPS && steps.slice(-MAX_FAILED_STEPS).every(stepFailed);
};

const runsOutOfTokens = (billing: RunBilling) => {
  return ({ steps }: { steps: StepResult<ToolSet>[] }) => {
    if (billing.free) {
      return false;
    }
    const totals = emptyUsage();
    for (const step of steps) {
      addUsage(totals, step.usage);
    }
    return tokensForUsage(totals) >= billing.balance;
  };
};

const PROTECTED_OUTPUT_CHARS = 120_000;
const MIN_PRUNE_CHARS = 80_000;
const PRUNABLE_TOOLS = new Set(["read_file", "grep", "read_logs", "run_sql", "install_packages"]);
const PRUNED_OUTPUT = "[Old output cleared to save context. Call the tool again if you need it.]";

const outputSize = (part: ToolResultPart) => {
  if (part.output.type === "text") {
    return part.output.value.length;
  }
  return JSON.stringify(part.output).length;
};

const pruneToolOutputs = (messages: ModelMessage[]) => {
  const prunable = new Set<ToolResultPart>();
  let kept = 0;
  let prunableChars = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "tool") {
      continue;
    }
    for (let partIndex = message.content.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.content[partIndex];
      if (part.type !== "tool-result" || !PRUNABLE_TOOLS.has(part.toolName)) {
        continue;
      }
      const size = outputSize(part);
      if (part.output.type === "text" && part.output.value === PRUNED_OUTPUT) {
        continue;
      }
      if (kept + size <= PROTECTED_OUTPUT_CHARS) {
        kept += size;
        continue;
      }
      prunable.add(part);
      prunableChars += size;
    }
  }
  if (prunableChars < MIN_PRUNE_CHARS) {
    return null;
  }
  return messages.map((message): ModelMessage => {
    if (message.role !== "tool") {
      return message;
    }
    return {
      ...message,
      content: message.content.map((part) => {
        if (part.type === "tool-result" && prunable.has(part)) {
          return { ...part, output: { type: "text", value: PRUNED_OUTPUT } };
        }
        return part;
      }),
    };
  });
};

const buildTools = (app: App, billing: RunBilling) => {
  const workspace = createWorkspace(app);
  const changed = async () => {
    if (billing.free) {
      await markFreeBuildUsed(billing.userId);
    }
  };
  return {
    read_file: tool({
      description: "Read a file. Returns lines prefixed with their line number and a | separator (not part of the file). Reads up to 2000 lines; use offset (1-based line) and limit for larger files.",
      inputSchema: z.object({
        path: z.string(),
        offset: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(2000).optional(),
      }),
      execute: async ({ path, offset, limit }) => {
        return workspace.read(path, offset, limit);
      },
    }),
    grep: tool({
      description: "Search the app's files with a JavaScript regular expression. Returns matching lines as path:line: text.",
      inputSchema: z.object({
        pattern: z.string(),
        include: z.string().optional().describe("Optional glob to limit files, for example *.js or public/**/*.html"),
      }),
      execute: async ({ pattern, include }) => {
        return workspace.grep(pattern, include);
      },
    }),
    edit_file: tool({
      description: "Replace old_string with new_string in a file you have read. old_string must match exactly once (unless replace_all) and must not include line number prefixes.",
      inputSchema: z.object({
        path: z.string(),
        old_string: z.string(),
        new_string: z.string(),
        replace_all: z.boolean().optional(),
      }),
      execute: async ({ path, old_string, new_string, replace_all }) => {
        const written = await workspace.edit(path, old_string, new_string, replace_all ?? false);
        await changed();
        return `Edited ${written}`;
      },
    }),
    write_file: tool({
      description: "Create a new file, or overwrite a file you have read, with its complete contents. Paths are relative to the app root, for example server.js or public/app.js.",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      execute: async ({ path, content }) => {
        const written = await workspace.write(path, content);
        await changed();
        return `Wrote ${written}`;
      },
    }),
    delete_file: tool({
      description: "Delete a file from the app.",
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        const removed = await workspace.remove(path);
        return `Deleted ${removed}`;
      },
    }),
    ask_questions: tool({
      description: "Ask the user up to 3 short questions with clickable options before planning a new app or big feature. Stops and waits for the answers.",
      inputSchema: z.object({
        questions: z
          .array(z.object({ text: z.string(), options: z.array(z.string()).min(2).max(4) }))
          .min(1)
          .max(3),
      }),
    }),
    propose_plan: tool({
      description: "Show the user a short build plan to approve. Stops and waits for approval.",
      inputSchema: z.object({
        summary: z.string().describe("One sentence describing what will be built"),
        items: z.array(z.string()).min(1).max(6).describe("Short items covering only what the user asked for"),
      }),
    }),
    choose_theme: tool({
      description: "Show the user the predefined themes to choose from. Stops and waits for the choice.",
      inputSchema: z.object({}),
    }),
    connect_storage: tool({
      description: "Connect the project's file storage bucket to this app, creating it if needed. Restarts the server with the S3_* variables set.",
      inputSchema: z.object({}),
      execute: async () => {
        const current = await prisma.app.findUniqueOrThrow({ where: { id: app.id } });
        const bucket = await connectProjectStorage(current);
        return `Connected bucket ${bucket.name}`;
      },
    }),
    run_sql: tool({
      description: "Run SQL against this app's database. Connects the project's database on first use. Returns the rows of the last statement.",
      inputSchema: z.object({ sql: z.string() }),
      execute: async ({ sql }) => {
        const current = await prisma.app.findUniqueOrThrow({ where: { id: app.id }, include: { aiDatabase: true } });
        let database = current.aiDatabase;
        if (database) {
          await verifyDatabase(database);
        } else {
          database = await connectProjectDatabase(current);
        }
        try {
          const result = await runQuery(database, sql);
          return truncate(JSON.stringify(result));
        } catch (error) {
          if (error instanceof Error && error.message.includes("password authentication failed")) {
            throw new Error("The project database rejected its saved password. Do not retry. Tell the user to open Databases, reset the database password, then send the request again.");
          }
          throw error;
        }
      },
    }),
    install_packages: tool({
      description: "Install npm packages into the app (npm install). Waits for the install to finish, records them in package.json and restarts the server. Returns npm's output.",
      inputSchema: z.object({
        packages: z.array(z.string()).min(1).max(20).describe("Package names, optionally with a version, for example stripe or nanoid@5"),
      }),
      execute: async ({ packages }) => {
        const current = await prisma.app.findUniqueOrThrow({ where: { id: app.id } });
        const result = await installAiPackages(current, packages);
        workspace.forget("package.json");
        if (result.ok) {
          return truncate(result.output);
        }
        return `npm install failed:\n${truncate(result.output)}`;
      },
    }),
    read_logs: tool({
      description: "Read the latest server logs (stdout and stderr) to check that the app starts and runs without errors.",
      inputSchema: z.object({}),
      execute: async () => {
        await wait(LOG_SETTLE_MS);
        const logs = await containerLogs(containerName(app.slug), 80);
        return truncate(logs || "No log output yet.");
      },
    }),
  };
};

const servicesLine = (services: { database: boolean; storage: boolean }) => {
  const label = (on: boolean) => {
    if (on) {
      return "connected";
    }
    return "not connected";
  };
  return `Connected services: database ${label(services.database)}, storage ${label(services.storage)}.`;
};

const PAUSING_TOOLS = new Set(["ask_questions", "propose_plan", "choose_theme"]);

const interactiveStep = (toolName: string, id: string, input: Record<string, unknown>): AiInteractiveStep | null => {
  if (toolName === "ask_questions") {
    let questions: unknown[] = [];
    if (Array.isArray(input.questions)) {
      questions = input.questions;
    }
    return {
      id,
      type: "questions",
      questions: questions.slice(0, 3).map((question, index) => {
        const item = question as { text?: unknown; options?: unknown };
        let options: string[] = [];
        if (Array.isArray(item.options)) {
          options = item.options.filter((option): option is string => typeof option === "string").slice(0, 4);
        }
        return { id: `q${index + 1}`, text: String(item.text ?? ""), options };
      }),
      answers: null,
    };
  }
  if (toolName === "propose_plan") {
    let items: string[] = [];
    if (Array.isArray(input.items)) {
      items = input.items.filter((item): item is string => typeof item === "string").slice(0, 6);
    }
    return { id, type: "plan", summary: String(input.summary ?? ""), items, status: "pending" };
  }
  if (toolName === "choose_theme") {
    return { id, type: "theme", chosen: null };
  }
  return null;
};

const themeLine = (themeId: string | null) => {
  const theme = findTheme(themeId);
  if (!theme) {
    return "Theme: not chosen yet.";
  }
  return themeSummary(theme);
};

const runGeneration = async (appId: string, billing: RunBilling) => {
  const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
  const history = await prisma.aiMessage.findMany({
    where: { appId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_MESSAGES,
  });
  history.reverse();
  const allFiles = await listAiFiles(appId);
  const files = allFiles.filter((file) => !isAiAssetPath(file.path));
  const assets = allFiles.filter((file) => isAiAssetPath(file.path));
  const services = `${servicesLine(await connectedServices(app))}\n${themeLine(app.aiTheme)}\n${assetsContext(assets)}`;

  const messages: ModelMessage[] = history.map((message, index) => {
    if (message.role === "assistant") {
      return { role: "assistant", content: message.content };
    }
    const request = `${message.content}${elementsContext(message.elements as AiElement[])}${attachmentsContext(message.attachments as string[])}`;
    if (index === history.length - 1) {
      return { role: "user", content: `${services}\n\nFiles:\n${filesContext(files)}\n\nRequest:\n${request}` };
    }
    return { role: "user", content: request };
  });

  const session = startLiveSession(appId);
  const totals = emptyUsage();
  let charged = 0;
  let usageId: string | null = null;
  let billingQueue: Promise<void> = Promise.resolve();
  const bill = () => {
    billingQueue = billingQueue
      .then(async () => {
        let tokens = 0;
        if (!billing.free) {
          tokens = tokensForUsage(totals);
        }
        const charge = Math.max(tokens - charged, 0);
        usageId = await recordUsage(billing, app, usageId, { ...totals }, tokens, charge);
        charged += charge;
      })
      .catch((error) => console.error("Failed to record AI token usage", error));
  };
  const toolInputs = new Map<string, { tool: string; raw: string; lastEmit: number }>();
  let lastPersist = 0;
  let progress = "Thinking";

  const persist = (force: boolean) => {
    const now = Date.now();
    if (!force && now - lastPersist < PERSIST_INTERVAL_MS) {
      return;
    }
    lastPersist = now;
    prisma.app.update({ where: { id: appId }, data: { aiProgress: progress, aiSteps: session.steps } }).catch(() => undefined);
  };

  const setTool = (id: string, patch: Partial<AiToolStep> & { tool: string }) => {
    const existing = session.steps.find((step): step is AiToolStep => step.type === "tool" && step.id === id);
    const step: AiToolStep = {
      id,
      type: "tool",
      tool: patch.tool,
      status: patch.status ?? existing?.status ?? "running",
      title: patch.title ?? existing?.title ?? patch.tool,
      detail: existing?.detail ?? null,
      output: existing?.output ?? null,
    };
    if (patch.detail !== undefined) {
      step.detail = patch.detail;
    }
    if (patch.output !== undefined) {
      step.output = patch.output;
    }
    progress = "Thinking";
    if (step.status === "running") {
      progress = step.title;
    }
    upsertStep(session, step);
    persist(false);
  };

  const agent = new ToolLoopAgent({
    model: google(MODEL_ID),
    instructions: INSTRUCTIONS,
    tools: buildTools(app, billing),
    stopWhen: [isStepCount(MAX_STEPS), keepsFailing, runsOutOfTokens(billing)],
    prepareStep: ({ messages: stepMessages }) => {
      const pruned = pruneToolOutputs(stepMessages);
      if (!pruned) {
        return {};
      }
      return { messages: pruned };
    },
  });

  persist(true);
  const result = await agent.stream({ messages });

  let modelStep = 0;
  for await (const part of result.stream) {
    if (part.type === "start-step") {
      modelStep += 1;
      continue;
    }
    if (part.type === "finish-step") {
      addUsage(totals, part.usage);
      bill();
      continue;
    }
    if (part.type === "text-delta") {
      const textId = `text-${modelStep}-${part.id}`;
      const last = session.steps[session.steps.length - 1];
      let step: AiTextStep = { id: textId, type: "text", text: part.text };
      if (last && last.type === "text" && last.id === textId) {
        step = { ...last, text: last.text + part.text };
      }
      progress = "Thinking";
      upsertStep(session, step);
      persist(false);
      continue;
    }
    if ((part.type === "tool-input-start" && PAUSING_TOOLS.has(part.toolName)) || (part.type === "tool-input-delta" && PAUSING_TOOLS.has(toolInputs.get(part.id)?.tool ?? ""))) {
      if (part.type === "tool-input-start") {
        toolInputs.set(part.id, { tool: part.toolName, raw: "", lastEmit: 0 });
      }
      continue;
    }
    if (part.type === "tool-call" && PAUSING_TOOLS.has(part.toolName)) {
      const step = interactiveStep(part.toolName, part.toolCallId, (part.input ?? {}) as Record<string, unknown>);
      if (step) {
        upsertStep(session, step);
        persist(true);
      }
      continue;
    }
    if (part.type === "tool-input-start") {
      toolInputs.set(part.id, { tool: part.toolName, raw: "", lastEmit: 0 });
      setTool(part.id, { tool: part.toolName, status: "running", title: runningTitle(part.toolName, {}) });
      continue;
    }
    if (part.type === "tool-input-delta") {
      const input = toolInputs.get(part.id);
      if (!input) {
        continue;
      }
      input.raw += part.delta;
      const now = Date.now();
      if (now - input.lastEmit < EMIT_INTERVAL_MS) {
        continue;
      }
      input.lastEmit = now;
      const path = partialJsonString(input.raw, "path");
      let detail: string | undefined = undefined;
      if (input.tool === "write_file") {
        detail = partialJsonString(input.raw, "content") ?? undefined;
      }
      if (input.tool === "edit_file") {
        detail = partialJsonString(input.raw, "new_string") ?? undefined;
      }
      if (input.tool === "run_sql") {
        detail = partialJsonString(input.raw, "sql") ?? undefined;
      }
      setTool(part.id, {
        tool: input.tool,
        title: runningTitle(input.tool, { path: path ?? "" }),
        detail,
      });
      continue;
    }
    if (part.type === "tool-call") {
      const input = (part.input ?? {}) as Record<string, unknown>;
      setTool(part.toolCallId, {
        tool: part.toolName,
        status: "running",
        title: runningTitle(part.toolName, input),
        detail: stepDetail(part.toolName, input),
      });
      continue;
    }
    if (part.type === "tool-result") {
      const input = (part.input ?? {}) as Record<string, unknown>;
      setTool(part.toolCallId, {
        tool: part.toolName,
        status: "done",
        title: doneTitle(part.toolName, input),
        output: stepOutput(part.toolName, part.output),
      });
      continue;
    }
    if (part.type === "tool-error") {
      let message = "Tool failed";
      if (part.error instanceof Error) {
        message = part.error.message;
      } else if (typeof part.error === "string") {
        message = part.error;
      }
      setTool(part.toolCallId, { tool: part.toolName, status: "error", output: clip(message) });
      continue;
    }
    if (part.type === "error") {
      if (part.error instanceof Error) {
        throw part.error;
      }
      throw new Error(String(part.error));
    }
  }

  let summary = session.steps
    .filter((step): step is AiTextStep => step.type === "text")
    .map((step) => step.text.trim())
    .filter(Boolean)
    .join("\n\n");
  const lastError = [...session.steps].reverse().find((step): step is AiToolStep => step.type === "tool" && step.status === "error");
  const finalSteps = await result.steps;
  if (keepsFailing({ steps: finalSteps as StepResult<ToolSet>[] }) && lastError) {
    const notice: AiTextStep = {
      id: "stopped-after-errors",
      type: "text",
      text: `I stopped because the same step kept failing: ${lastError.output ?? lastError.title}`,
    };
    upsertStep(session, notice);
    summary = [summary, notice.text].filter(Boolean).join("\n\n");
  }
  await billingQueue;
  if (!billing.free && tokensForUsage(totals) >= billing.balance) {
    const notice: AiTextStep = { id: "out-of-tokens", type: "text", text: `I stopped because your token balance ran out. ${OUT_OF_TOKENS}` };
    upsertStep(session, notice);
    summary = [summary, notice.text].filter(Boolean).join("\n\n");
  }
  if (!summary) {
    summary = "Done.";
  }
  await prisma.$transaction([
    prisma.aiMessage.create({ data: { appId, role: "assistant", content: summary, steps: session.steps } }),
    prisma.app.update({ where: { id: appId }, data: { aiStatus: "IDLE", aiProgress: null, aiError: null, aiSteps: [] } }),
  ]);
  endLiveSession(appId, "IDLE", null);
};

export const startGeneration = (appId: string, billing: RunBilling) => {
  runGeneration(appId, billing).catch(async (error) => {
    console.error("AI generation failed", error);
    let message = "The AI could not finish this request. Try again.";
    if (error instanceof Error && error.message) {
      message = `The AI could not finish this request: ${error.message}`;
    }
    const steps = liveSession(appId)?.steps ?? [];
    await prisma.app
      .update({ where: { id: appId }, data: { aiStatus: "FAILED", aiProgress: null, aiError: message, aiSteps: steps } })
      .catch(() => undefined);
    endLiveSession(appId, "FAILED", message);
  });
};

export const resetStuckGenerations = () => {
  return prisma.app.updateMany({
    where: { aiStatus: "GENERATING" },
    data: { aiStatus: "FAILED", aiProgress: null, aiError: "Generation was interrupted by a server restart. Try again." },
  });
};
