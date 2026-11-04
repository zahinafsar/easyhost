import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { json, request } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { fail, isJsonMode, log, output } from "../lib/ui.js";

type AiApp = {
  id: string;
  name: string;
  slug: string;
  url: string;
  status: string;
  aiStatus: "IDLE" | "GENERATING" | "FAILED";
  aiProgress: string | null;
  aiError: string | null;
};
type AiMessage = { id: string; role: string; content: string; createdAt: string };
type AiFile = { path: string; size: number };
type AiDetail = { app: AiApp; messages: AiMessage[]; files: AiFile[] };

const POLL_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchDetail = async (name: string, projectId: string) => {
  return request<AiDetail>(`/ai-apps/${encodeURIComponent(name)}`, {}, projectId);
};

export const listAiApps = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  const { apps } = await request<{ apps: AiApp[] }>("/ai-apps", {}, project.id);
  output({ apps }, () => {
    if (!apps.length) {
      log.info("No AI apps yet. Create one with `ezhst ai create <name>`.");
      return;
    }
    for (const app of apps) {
      let status = app.status;
      if (app.aiStatus === "GENERATING") {
        status = "GENERATING";
      }
      log.info(`${pc.bold(app.slug.padEnd(40))} ${status.padEnd(12)} ${app.url}`);
    }
  });
};

export const createAiApp = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { app } = await request<{ app: AiApp }>("/ai-apps", json("POST", { name }), project.id);
  output({ app }, () => {
    log.success(`Created ${app.name} at ${app.url}`);
    log.info(`Describe what to build: ezhst ai prompt ${app.slug} "a todo app with log in"`);
  });
};

export const promptAiApp = async (name: string, text: string, options: ProjectOption & { wait?: boolean }) => {
  const project = await resolveProject(options);
  await request<{ message: AiMessage }>(`/ai-apps/${encodeURIComponent(name)}/prompt`, json("POST", { prompt: text }), project.id);
  if (options.wait === false) {
    output({ status: "GENERATING" }, () => log.success("Prompt sent. Check progress with `ezhst ai status`."));
    return;
  }

  let lastProgress = "";
  while (true) {
    await sleep(POLL_MS);
    const detail = await fetchDetail(name, project.id);
    const { app } = detail;
    if (app.aiStatus === "GENERATING") {
      if (app.aiProgress && app.aiProgress !== lastProgress && !isJsonMode()) {
        lastProgress = app.aiProgress;
        log.dim(app.aiProgress);
      }
      continue;
    }
    if (app.aiStatus === "FAILED") {
      return fail(app.aiError ?? "The AI could not finish this request.");
    }
    const reply = detail.messages[detail.messages.length - 1];
    output({ app, reply }, () => {
      if (reply) {
        log.info(reply.content);
      }
      log.success(`Live at ${app.url}`);
    });
    return;
  }
};

export const aiAppStatus = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const detail = await fetchDetail(name, project.id);
  output(detail, () => {
    const { app } = detail;
    log.info(`${pc.bold(app.slug)}  ${app.url}`);
    let aiLine = `App ${app.status}, AI ${app.aiStatus}`;
    if (app.aiProgress) {
      aiLine = `${aiLine}: ${app.aiProgress}`;
    }
    log.info(aiLine);
    if (app.aiError) {
      log.info(pc.red(app.aiError));
    }
    for (const message of detail.messages.slice(-6)) {
      log.info(`${pc.dim(message.role.padEnd(10))} ${message.content}`);
    }
  });
};

export const listAiFiles = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { files } = await fetchDetail(name, project.id);
  output({ files }, () => {
    for (const file of files) {
      log.info(`${file.path.padEnd(48)} ${pc.dim(`${file.size} B`)}`);
    }
  });
};

export const pullAiApp = async (name: string, directory: string | undefined, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { app, files } = await fetchDetail(name, project.id);
  const target = path.resolve(directory ?? app.slug);
  for (const file of files) {
    const { content } = await request<{ content: string }>(
      `/ai-apps/${encodeURIComponent(name)}/file?path=${encodeURIComponent(file.path)}`,
      {},
      project.id,
    );
    const destination = path.join(target, file.path);
    if (!destination.startsWith(target + path.sep)) {
      return fail(`Refusing to write outside ${target}: ${file.path}`);
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, content);
  }
  output({ directory: target, files: files.length }, () => log.success(`Downloaded ${files.length} files to ${target}`));
};
