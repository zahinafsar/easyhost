import path from "node:path";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { extract } from "tar-stream";

export const NODE_VERSIONS = ["20", "22", "24"] as const;

export type NodeVersion = (typeof NODE_VERSIONS)[number];

const DEFAULT_NODE_VERSION: NodeVersion = "24";

const MANAGERS: Record<string, { install: string; run: string }> = {
  "pnpm-lock.yaml": { install: "corepack enable pnpm && pnpm install --frozen-lockfile", run: "pnpm run" },
  "yarn.lock": { install: "corepack enable yarn && yarn install --frozen-lockfile", run: "yarn run" },
  "bun.lock": { install: "npm install -g bun && bun install --frozen-lockfile", run: "bun run" },
  "bun.lockb": { install: "npm install -g bun && bun install --frozen-lockfile", run: "bun run" },
  "package-lock.json": { install: "npm ci", run: "npm run" },
};

const FALLBACK_MANAGER = { install: "npm install", run: "npm run" };

const LOCKFILES = Object.keys(MANAGERS);

export type BuildSettings = {
  nodeVersion: string | null;
  rootDir: string | null;
  installCommand: string | null;
  buildCommand: string | null;
  startCommand: string | null;
};

export type BuildPlan = {
  nodeVersion: NodeVersion;
  installDir: string;
  appDir: string;
  install: string;
  build: string | null;
  start: string;
};

const inDir = (dir: string, file: string) => {
  if (!dir) {
    return file;
  }
  return `${dir}/${file}`;
};

const readSource = async (artifact: Buffer, wanted: Set<string>) => {
  const names = new Set<string>();
  const contents = new Map<string, string>();
  const tar = extract();
  const gunzip = createGunzip();
  gunzip.on("error", (error) => tar.destroy(error));
  Readable.from([artifact]).pipe(gunzip).pipe(tar);

  for await (const entry of tar) {
    const name = path.posix.normalize(entry.header.name).replace(/\/$/, "");
    names.add(name);
    if (!wanted.has(name)) {
      entry.resume();
      continue;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of entry) {
      chunks.push(chunk as Buffer);
    }
    contents.set(name, Buffer.concat(chunks).toString("utf8"));
  }

  return { names, contents };
};

type PackageManifest = {
  engines?: { node?: string };
  scripts?: Record<string, string>;
  main?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const readPackage = (file: string, content: string | undefined): PackageManifest => {
  if (!content) {
    return {};
  }
  try {
    const manifest = JSON.parse(content);
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error();
    }
    return manifest;
  } catch {
    throw new Error(`${file} is not a valid package.json`);
  }
};

const nodeFromEngines = (range: string | undefined): NodeVersion => {
  if (!range || range.trim().startsWith(">")) {
    return DEFAULT_NODE_VERSION;
  }
  const major = range.match(/\d+/)?.[0];
  const supported = NODE_VERSIONS.find((version) => version === major);
  if (supported) {
    return supported;
  }
  return DEFAULT_NODE_VERSION;
};

const isNodeVersion = (value: string | null): value is NodeVersion => NODE_VERSIONS.some((version) => version === value);

export const resolveBuildPlan = async (artifact: Buffer, settings: BuildSettings): Promise<BuildPlan> => {
  const appDir = settings.rootDir ?? "";
  const appPackage = inDir(appDir, "package.json");
  const { names, contents } = await readSource(artifact, new Set([appPackage, "package.json"]));

  if (!names.has(appPackage)) {
    throw new Error(`No package.json found in ${appDir || "the project root"}. Check the root directory in the Build settings.`);
  }

  const hasLockfile = (dir: string) => LOCKFILES.some((file) => names.has(inDir(dir, file)));
  let installDir = appDir;
  if (appDir && !hasLockfile(appDir) && hasLockfile("")) {
    installDir = "";
  }

  const lockfile = LOCKFILES.find((file) => names.has(inDir(installDir, file)));
  let manager = FALLBACK_MANAGER;
  if (lockfile) {
    manager = MANAGERS[lockfile];
  }

  const manifest = readPackage(appPackage, contents.get(appPackage));
  const rootManifest = readPackage("package.json", contents.get("package.json"));

  let nodeVersion: NodeVersion;
  if (isNodeVersion(settings.nodeVersion)) {
    nodeVersion = settings.nodeVersion;
  } else {
    const engines = manifest.engines?.node ?? rootManifest.engines?.node;
    nodeVersion = nodeFromEngines(engines);
  }

  let start = settings.startCommand;
  if (!start && manifest.scripts?.start) {
    start = `${manager.run} start`;
  }
  if (!start && (manifest.dependencies?.next || manifest.devDependencies?.next)) {
    start = "next start -H 0.0.0.0 -p $PORT";
  }
  if (!start) {
    const candidates = [manifest.main, "index.js", "server.js"].filter((file): file is string => typeof file === "string");
    const entry = candidates.find((file) => names.has(inDir(appDir, file)));
    if (entry) {
      start = `node -- '${entry.replaceAll("'", "'\\''")}'`;
    }
  }
  if (!start) {
    throw new Error("No start script or Node.js entry file found. Add scripts.start to package.json or set a start command in Build settings.");
  }

  return {
    nodeVersion,
    installDir,
    appDir,
    install: settings.installCommand ?? manager.install,
    build: settings.buildCommand ?? (manifest.scripts?.build ? `${manager.run} build` : null),
    start,
  };
};
