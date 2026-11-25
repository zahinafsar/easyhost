import path from "node:path";
import { randomBytes } from "node:crypto";
import type { App, Database } from "@prisma/client";
import { prisma } from "./prisma.js";
import { projectEntitlement } from "./billing.js";
import { S3_REGION, createProjectBucket, minio, publicBaseUrl, s3Endpoint } from "./minio.js";
import { env } from "./env.js";
import { appUrl } from "./domains.js";
import { APP_PORT, containerExists, containerName, execInContainer, publishedPort, putContainerFiles, removeContainerFiles, restartContainer, runAiContainer } from "./docker.js";
import { connectionString, createUserDatabase, generateCredentials, restoreUserDatabase } from "./userdb.js";
import { LIMITS } from "./limits.js";

export const AI_BUCKET = "easyhost-ai";

let bucketReady: Promise<void> | null = null;

const ensureBucket = () => {
  if (!bucketReady) {
    bucketReady = (async () => {
      const exists = await minio.bucketExists(AI_BUCKET);
      if (!exists) {
        await minio.makeBucket(AI_BUCKET);
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
};

const objectKey = (appId: string, filePath: string) => `${appId}/${filePath}`;

export const AI_ASSET_DIR = "public/uploads";

export const AI_ASSET_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

export const isAiAssetPath = (filePath: string) => filePath.startsWith(`${AI_ASSET_DIR}/`);

export const aiAssetUrl = (filePath: string) => filePath.slice("public".length);

const assetExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const assetContentType = (filePath: string) => AI_ASSET_TYPES[assetExtension(filePath)] ?? "application/octet-stream";

const READ_ONLY_ASSET = `Files in ${AI_ASSET_DIR} are images uploaded by the user. They cannot be edited, replaced or deleted, only referenced by URL.`;

export class AiFileError extends Error {}

export const normalizeFilePath = (input: string) => {
  const trimmed = input.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  const normalized = path.posix.normalize(trimmed);
  if (!normalized || normalized === "." || normalized.startsWith("/") || normalized.startsWith("..")) {
    throw new AiFileError(`Invalid path: ${input}`);
  }
  if (normalized.split("/").some((part) => part === "node_modules" || part.startsWith(".env"))) {
    throw new AiFileError(`Path not allowed: ${input}`);
  }
  if (!/^[A-Za-z0-9._\-/]+$/.test(normalized)) {
    throw new AiFileError(`Path has unsupported characters: ${input}`);
  }
  return normalized;
};

export const listAiFiles = async (appId: string) => {
  await ensureBucket();
  const prefix = `${appId}/`;
  return new Promise<{ path: string; size: number }[]>((resolve, reject) => {
    const files: { path: string; size: number }[] = [];
    const stream = minio.listObjectsV2(AI_BUCKET, prefix, true);
    stream.on("data", (item) => {
      if (item.name) {
        files.push({ path: item.name.slice(prefix.length), size: item.size });
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(files.sort((a, b) => a.path.localeCompare(b.path))));
  });
};

export const readAiFileBytes = async (appId: string, filePath: string) => {
  await ensureBucket();
  const stream = await minio.getObject(AI_BUCKET, objectKey(appId, normalizeFilePath(filePath)));
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
};

export const readAiFile = async (appId: string, filePath: string) => {
  const bytes = await readAiFileBytes(appId, filePath);
  return bytes.toString("utf8");
};

export const readAllAiFiles = async (appId: string) => {
  const files = (await listAiFiles(appId)).filter((file) => !isAiAssetPath(file.path));
  return Promise.all(files.map(async (file) => ({ path: file.path, content: await readAiFile(appId, file.path) })));
};

export const readAllAiFileBytes = async (appId: string) => {
  const files = await listAiFiles(appId);
  return Promise.all(files.map(async (file) => ({ path: file.path, content: await readAiFileBytes(appId, file.path) })));
};

export const listAiAssets = async (appId: string) => {
  const files = await listAiFiles(appId);
  return files.filter((file) => isAiAssetPath(file.path));
};

const assetFileName = (name: string) => {
  const extension = assetExtension(name);
  const base = name
    .slice(0, name.length - extension.length - 1)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  if (base) {
    return { base, extension };
  }
  return { base: "image", extension };
};

export const saveAiAsset = async (app: Pick<App, "id" | "slug">, file: File) => {
  const { base, extension } = assetFileName(file.name);
  const contentType = AI_ASSET_TYPES[extension];
  if (!contentType) {
    throw new AiFileError(`Only images can be attached (${Object.keys(AI_ASSET_TYPES).join(", ")})`);
  }
  if (file.size > LIMITS.aiAssetBytes) {
    throw new AiFileError(`${file.name} is larger than ${LIMITS.aiAssetBytes / 1024 / 1024} MB`);
  }
  const files = await listAiFiles(app.id);
  if (files.length >= LIMITS.aiFiles) {
    throw new AiFileError(`An AI app can have at most ${LIMITS.aiFiles} files`);
  }
  const taken = new Set(files.map((item) => item.path));
  let filePath = `${AI_ASSET_DIR}/${base}.${extension}`;
  let suffix = 2;
  while (taken.has(filePath)) {
    filePath = `${AI_ASSET_DIR}/${base}-${suffix}.${extension}`;
    suffix += 1;
  }
  const content = Buffer.from(await file.arrayBuffer());
  await ensureBucket();
  await minio.putObject(AI_BUCKET, objectKey(app.id, filePath), content, content.length, { "Content-Type": contentType });
  const name = containerName(app.slug);
  if (await containerExists(name)) {
    await putContainerFiles(name, [{ path: filePath, content }]);
  }
  return { path: filePath, url: aiAssetUrl(filePath), size: content.length };
};

export const readAiAsset = async (appId: string, filePath: string) => {
  const normalized = normalizeFilePath(filePath);
  if (!isAiAssetPath(normalized)) {
    throw new AiFileError("Not an uploaded image");
  }
  return { content: await readAiFileBytes(appId, normalized), contentType: assetContentType(normalized) };
};

const INSTALL_TIMEOUT_MS = 180_000;
const PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[A-Za-z0-9.^~<>=*|+-]+)?$/;

const dependenciesOf = (content: string | null) => {
  if (content === null) {
    return "";
  }
  try {
    const parsed = JSON.parse(content) as { dependencies?: unknown };
    return JSON.stringify(parsed.dependencies ?? {});
  } catch {
    return "invalid";
  }
};

const readAiFileOrNull = async (appId: string, filePath: string) => {
  try {
    return await readAiFile(appId, filePath);
  } catch (error) {
    if ((error as { code?: string }).code === "NoSuchKey") {
      return null;
    }
    throw error;
  }
};

export const writeAiFile = async (app: Pick<App, "id" | "slug">, filePath: string, content: string) => {
  const normalized = normalizeFilePath(filePath);
  if (isAiAssetPath(normalized)) {
    throw new AiFileError(READ_ONLY_ASSET);
  }
  let previous: string | null = null;
  if (normalized === "package.json") {
    previous = await readAiFileOrNull(app.id, normalized);
  }
  const size = Buffer.byteLength(content);
  if (size > LIMITS.aiFileBytes) {
    throw new AiFileError(`${normalized} is larger than ${LIMITS.aiFileBytes / 1024} KB`);
  }
  const files = await listAiFiles(app.id);
  if (!files.some((file) => file.path === normalized) && files.length >= LIMITS.aiFiles) {
    throw new AiFileError(`An AI app can have at most ${LIMITS.aiFiles} files`);
  }
  await minio.putObject(AI_BUCKET, objectKey(app.id, normalized), Buffer.from(content), size);
  const name = containerName(app.slug);
  if (await containerExists(name)) {
    await putContainerFiles(name, [{ path: normalized, content }]);
    if (normalized === "package.json" && dependenciesOf(previous) !== dependenciesOf(content)) {
      await restartContainer(name);
    }
  }
  return normalized;
};

export const deleteAiFile = async (app: Pick<App, "id" | "slug">, filePath: string) => {
  const normalized = normalizeFilePath(filePath);
  if (isAiAssetPath(normalized)) {
    throw new AiFileError(READ_ONLY_ASSET);
  }
  await ensureBucket();
  await minio.removeObject(AI_BUCKET, objectKey(app.id, normalized));
  const name = containerName(app.slug);
  if (await containerExists(name)) {
    await removeContainerFiles(name, [normalized]);
  }
  return normalized;
};

export const removeAllAiFiles = async (appId: string) => {
  const files = await listAiFiles(appId);
  if (files.length) {
    await minio.removeObjects(AI_BUCKET, files.map((file) => objectKey(appId, file.path)));
  }
};

export const generateAuthSecret = () => randomBytes(32).toString("hex");

const forContainer = (url: string) => {
  if (env.isProduction) {
    return url;
  }
  const parsed = new URL(url);
  if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    return url;
  }
  parsed.hostname = "host.docker.internal";
  return parsed.toString();
};

type AiEnvApp = Pick<App, "env" | "aiAuthSecret" | "parentProjectId" | "id" | "aiDatabaseId" | "aiBucketId">;

const findLinked = async (app: AiEnvApp) => {
  let database = null;
  if (app.aiDatabaseId) {
    database = await prisma.database.findUnique({ where: { id: app.aiDatabaseId } });
  }
  let bucket = null;
  if (app.aiBucketId) {
    bucket = await prisma.bucket.findUnique({ where: { id: app.aiBucketId } });
  }
  return { database, bucket };
};

export const connectedServices = async (app: AiEnvApp) => {
  const { database, bucket } = await findLinked(app);
  return { database: !!database, storage: !!bucket };
};

export const aiAppEnv = async (app: AiEnvApp) => {
  const { database, bucket } = await findLinked(app);
  const values: Record<string, string> = {
    ...(app.env as Record<string, string>),
    PORT: String(APP_PORT),
    EASYHOST_DASHBOARD_ORIGIN: new URL(env.appUrl).origin,
  };
  if (app.aiAuthSecret) {
    values.AUTH_SECRET = app.aiAuthSecret;
  }
  if (database) {
    values.DATABASE_URL = forContainer(connectionString(database));
  }
  if (bucket) {
    values.S3_ENDPOINT = forContainer(s3Endpoint());
    values.S3_REGION = S3_REGION;
    values.S3_BUCKET = bucket.minioName;
    values.S3_ACCESS_KEY_ID = bucket.accessKey;
    values.S3_SECRET_ACCESS_KEY = bucket.secretKey;
    values.S3_PUBLIC_URL = publicBaseUrl(bucket.minioName);
  }
  return values;
};

const READY_TIMEOUT_MS = 20_000;
const READY_INTERVAL_MS = 300;

const READY_PROBE = `fetch("http://127.0.0.1:${APP_PORT}").then(() => process.exit(0), () => process.exit(1))`;

const answers = async (slug: string) => {
  if (env.isProduction) {
    const result = await execInContainer(containerName(slug), ["node", "-e", READY_PROBE], 3000).catch(() => null);
    return result?.exitCode === 0;
  }
  const port = await publishedPort(containerName(slug));
  if (!port) {
    return false;
  }
  return fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(2000) }).then(
    () => true,
    () => false,
  );
};

const waitUntilReady = async (slug: string) => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await answers(slug)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
  }
  return false;
};

export const startAiApp = async (app: App) => {
  const files = await readAllAiFileBytes(app.id);
  const containerId = await runAiContainer(containerName(app.slug), await aiAppEnv(app), files, { publishPort: !env.isProduction });
  await waitUntilReady(app.slug);
  return prisma.app.update({ where: { id: app.id }, data: { containerId, status: "RUNNING" } });
};

export const aiPreviewUrl = async (app: Pick<App, "slug">) => {
  if (env.isProduction) {
    return appUrl(app.slug);
  }
  const port = await publishedPort(containerName(app.slug));
  if (!port) {
    return null;
  }
  return `http://localhost:${port}`;
};

export const connectProjectDatabase = async (app: App) => {
  const projectId = app.parentProjectId ?? app.id;
  const { database } = await ensureProjectDatabase(projectId);
  const updated = await prisma.app.update({ where: { id: app.id }, data: { aiDatabaseId: database.id } });
  await startAiApp(updated);
  return database;
};

export const connectProjectStorage = async (app: App) => {
  const projectId = app.parentProjectId ?? app.id;
  let bucket = await prisma.bucket.findUnique({ where: { projectId } });
  if (!bucket) {
    const entitlement = await projectEntitlement(projectId);
    bucket = await createProjectBucket(projectId, "app", entitlement.limits.storageBytes);
  }
  const updated = await prisma.app.update({ where: { id: app.id }, data: { aiBucketId: bucket.id } });
  await startAiApp(updated);
  return bucket;
};

const verifiedDatabases = new Set<string>();

export const verifyDatabase = async (database: Database) => {
  if (!verifiedDatabases.has(database.id)) {
    await restoreUserDatabase(database);
    verifiedDatabases.add(database.id);
  }
};

export const ensureProjectDatabase = async (projectId: string) => {
  const existing = await prisma.database.findUnique({ where: { projectId } });
  if (existing) {
    await verifyDatabase(existing);
    return { database: existing, created: false };
  }
  const credentials = generateCredentials();
  await createUserDatabase(credentials);
  const database = await prisma.database.create({ data: { projectId, name: "app", ...credentials } });
  return { database, created: true };
};

export const installAiPackages = async (app: App, packages: string[]) => {
  const invalid = packages.filter((item) => !PACKAGE_SPEC.test(item));
  if (invalid.length) {
    throw new AiFileError(`Invalid package names: ${invalid.join(", ")}`);
  }
  const name = containerName(app.slug);
  if (!(await containerExists(name))) {
    await startAiApp(app);
  }
  const result = await execInContainer(
    name,
    ["npm", "install", "--no-audit", "--no-fund", "--prefer-offline", "--loglevel=error", ...packages],
    INSTALL_TIMEOUT_MS,
  );
  if (result.exitCode !== 0) {
    return { ok: false, output: result.output.trim() || "npm install failed" };
  }
  const packageJson = await execInContainer(name, ["cat", "package.json"], 10_000);
  if (packageJson.exitCode === 0 && packageJson.output.trim()) {
    const content = packageJson.output;
    await minio.putObject(AI_BUCKET, objectKey(app.id, "package.json"), Buffer.from(content), Buffer.byteLength(content));
  }
  await restartContainer(name);
  return { ok: true, output: result.output.trim() || `Installed ${packages.join(", ")}` };
};

export const restartAiApps = async (databaseId: string) => {
  const apps = await prisma.app.findMany({
    where: { kind: "AI", deleting: false, status: "RUNNING", aiDatabaseId: databaseId },
  });
  for (const app of apps) {
    await startAiApp(app).catch((error) => console.error(`Failed to restart AI app ${app.slug}`, error));
  }
};
