import path from "node:path";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { extract } from "tar-stream";

export const NODE_VERSIONS = ["20", "22", "24"] as const;

export type NodeVersion = (typeof NODE_VERSIONS)[number];

const DEFAULT_NODE_VERSION: NodeVersion = "24";

const DEFAULT_START = "next start -H 0.0.0.0 -p $PORT";

const MANAGERS: Record<string, { install: string; build: string }> = {
  "pnpm-lock.yaml": { install: "corepack enable pnpm && pnpm install --frozen-lockfile", build: "pnpm run build" },
  "yarn.lock": { install: "corepack enable yarn && yarn install --frozen-lockfile", build: "yarn run build" },
  "bun.lock": { install: "npm install -g bun && bun install --frozen-lockfile", build: "bun run build" },
  "bun.lockb": { install: "npm install -g bun && bun install --frozen-lockfile", build: "bun run build" },
  "package-lock.json": { install: "npm ci", build: "npm run build" },
};

const FALLBACK_MANAGER = { install: "npm install", build: "npm run build" };

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
  build: string;
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

const readEngines = (file: string, content: string | undefined) => {
  if (!content) {
    return undefined;
  }
  try {
    const engines = (JSON.parse(content) as { engines?: { node?: unknown } }).engines;
    if (typeof engines?.node === "string") {
      return engines.node;
    }
    return undefined;
  } catch {
    throw new Error(`${file} is not valid JSON`);
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

  let nodeVersion: NodeVersion;
  if (isNodeVersion(settings.nodeVersion)) {
    nodeVersion = settings.nodeVersion;
  } else {
    const engines = readEngines(appPackage, contents.get(appPackage)) ?? readEngines("package.json", contents.get("package.json"));
    nodeVersion = nodeFromEngines(engines);
  }

  return {
    nodeVersion,
    installDir,
    appDir,
    install: settings.installCommand ?? manager.install,
    build: settings.buildCommand ?? manager.build,
    start: settings.startCommand ?? DEFAULT_START,
  };
};
