import type Docker from "dockerode";
import { prisma } from "./prisma.js";
import { docker, removeContainer, removeImage, AI_RUNTIME_IMAGE } from "./docker.js";
import { DEPLOY_BUCKET, emptyAndRemoveBucket, minio } from "./minio.js";
import { AI_BUCKET } from "./ai-apps.js";
import { APP_IMAGE_PREFIX } from "./registry.js";

const GRACE_MS = 60 * 60 * 1000;
const APP_CONTAINER_PREFIX = "eh-app-";
const PROJECT_BUCKET_PREFIX = "eh-";
const REMOVE_BATCH = 1000;

type JunkKey = "images" | "danglingImages" | "buildCache" | "containers" | "artifacts" | "aiFiles" | "buckets";

type JunkGroup = { key: JunkKey; label: string; description: string; count: number; bytes: number };

type StoredObject = { name: string; size: number; lastModified: Date | null };

type JunkScan = {
  groups: JunkGroup[];
  images: string[];
  containers: string[];
  artifacts: string[];
  aiFiles: string[];
  buckets: string[];
};

const listObjects = async (bucket: string) => {
  if (!(await minio.bucketExists(bucket))) {
    return [];
  }
  return new Promise<StoredObject[]>((resolve, reject) => {
    const items: StoredObject[] = [];
    const stream = minio.listObjectsV2(bucket, "", true);
    stream.on("data", (item) => {
      if (item.name) {
        items.push({ name: item.name, size: item.size, lastModified: item.lastModified ?? null });
      }
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(items));
  });
};

const isOld = (date: Date | null | undefined) => {
  if (!date) {
    return true;
  }
  return Date.now() - date.getTime() > GRACE_MS;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const removeObjectsInBatches = async (bucket: string, keys: string[]) => {
  for (let index = 0; index < keys.length; index += REMOVE_BATCH) {
    await minio.removeObjects(bucket, keys.slice(index, index + REMOVE_BATCH));
  }
};

const scanImages = async (usedImageIds: Set<string>) => {
  const deployments = await prisma.deployment.findMany({
    where: { status: { in: ["QUEUED", "BUILDING", "RUNNING"] }, imageTag: { not: null } },
    select: { imageTag: true },
  });
  const keepTags = new Set(deployments.map((deployment) => deployment.imageTag));
  const images = await docker.listImages();
  const unused = images.filter((image) => {
    if (usedImageIds.has(image.Id)) {
      return false;
    }
    const tags = image.RepoTags ?? [];
    if (!tags.length || tags.some((tag) => !tag.startsWith(APP_IMAGE_PREFIX) || tag.startsWith(AI_RUNTIME_IMAGE))) {
      return false;
    }
    if (tags.some((tag) => keepTags.has(tag))) {
      return false;
    }
    return isOld(new Date(image.Created * 1000));
  });
  return { tags: unused.map((image) => image.RepoTags![0]), bytes: sum(unused.map((image) => image.Size)) };
};

const scanDanglingImages = async (usedImageIds: Set<string>) => {
  const images = await docker.listImages({ filters: { dangling: ["true"] } });
  const unused = images.filter((image) => !usedImageIds.has(image.Id));
  return { count: unused.length, bytes: sum(unused.map((image) => image.Size)) };
};

const scanBuildCache = async () => {
  const usage = (await docker.df()) as { BuildCache?: { Size: number; InUse: boolean }[] | null };
  const entries = (usage.BuildCache ?? []).filter((entry) => !entry.InUse);
  return { count: entries.length, bytes: sum(entries.map((entry) => entry.Size)) };
};

const scanContainers = async () => {
  const [containers, apps] = await Promise.all([
    docker.listContainers({ all: true, size: true, filters: { label: ["easyhost.app"] } }) as Promise<(Docker.ContainerInfo & { SizeRw?: number })[]>,
    prisma.app.findMany({ select: { slug: true } }),
  ]);
  const slugs = new Set(apps.map((app) => app.slug));
  const orphans = containers.filter((container) => {
    const name = (container.Names[0] ?? "").replace(/^\//, "");
    if (!name.startsWith(APP_CONTAINER_PREFIX)) {
      return false;
    }
    if (slugs.has(name.slice(APP_CONTAINER_PREFIX.length))) {
      return false;
    }
    return isOld(new Date(container.Created * 1000));
  });
  return {
    names: orphans.map((container) => container.Names[0].replace(/^\//, "")),
    bytes: sum(orphans.map((container) => container.SizeRw ?? 0)),
  };
};

const scanArtifacts = async () => {
  const [objects, active, deployed] = await Promise.all([
    listObjects(DEPLOY_BUCKET),
    prisma.deployment.findMany({ where: { status: { in: ["QUEUED", "BUILDING", "RUNNING"] } }, select: { artifactKey: true } }),
    prisma.deployment.findMany({
      where: { status: { in: ["RUNNING", "SUPERSEDED"] } },
      orderBy: { createdAt: "desc" },
      distinct: ["appId"],
      select: { artifactKey: true },
    }),
  ]);
  const keep = new Set([...active, ...deployed].map((deployment) => deployment.artifactKey));
  const junk = objects.filter((object) => !keep.has(object.name) && isOld(object.lastModified));
  return { keys: junk.map((object) => object.name), bytes: sum(junk.map((object) => object.size)) };
};

const scanAiFiles = async () => {
  const [objects, apps] = await Promise.all([listObjects(AI_BUCKET), prisma.app.findMany({ select: { id: true } })]);
  const appIds = new Set(apps.map((app) => app.id));
  const junk = objects.filter((object) => !appIds.has(object.name.split("/")[0]) && isOld(object.lastModified));
  return { keys: junk.map((object) => object.name), bytes: sum(junk.map((object) => object.size)) };
};

const scanBuckets = async () => {
  const [buckets, rows] = await Promise.all([minio.listBuckets(), prisma.bucket.findMany({ select: { minioName: true } })]);
  const known = new Set(rows.map((row) => row.minioName));
  const orphans = buckets.filter((bucket) => {
    if (!bucket.name.startsWith(PROJECT_BUCKET_PREFIX) || known.has(bucket.name)) {
      return false;
    }
    return isOld(bucket.creationDate);
  });
  const sizes = await Promise.all(orphans.map(async (bucket) => sum((await listObjects(bucket.name)).map((object) => object.size))));
  return { names: orphans.map((bucket) => bucket.name), bytes: sum(sizes) };
};

export const scanJunk = async (): Promise<JunkScan> => {
  const runningContainers = await docker.listContainers({ all: true });
  const usedImageIds = new Set(runningContainers.map((container) => container.ImageID));

  const [images, dangling, buildCache, containers, artifacts, aiFiles, buckets] = await Promise.all([
    scanImages(usedImageIds),
    scanDanglingImages(usedImageIds),
    scanBuildCache(),
    scanContainers(),
    scanArtifacts(),
    scanAiFiles(),
    scanBuckets(),
  ]);

  return {
    groups: [
      { key: "images", label: "Old app images", description: "Images from superseded or failed deployments that no container uses.", count: images.tags.length, bytes: images.bytes },
      { key: "danglingImages", label: "Dangling images", description: "Untagged image layers left behind by builds.", count: dangling.count, bytes: dangling.bytes },
      { key: "buildCache", label: "Build cache", description: "Docker build cache not in use. Next builds will be slower until it warms up again.", count: buildCache.count, bytes: buildCache.bytes },
      { key: "containers", label: "Orphan containers", description: "App containers whose app no longer exists.", count: containers.names.length, bytes: containers.bytes },
      { key: "artifacts", label: "Old deploy uploads", description: "Uploaded source archives that are not the latest successful deploy of any app.", count: artifacts.keys.length, bytes: artifacts.bytes },
      { key: "aiFiles", label: "Orphan AI app files", description: "AI builder files of apps that no longer exist.", count: aiFiles.keys.length, bytes: aiFiles.bytes },
      { key: "buckets", label: "Orphan storage buckets", description: "Project buckets with no project linked to them.", count: buckets.names.length, bytes: buckets.bytes },
    ],
    images: images.tags,
    containers: containers.names,
    artifacts: artifacts.keys,
    aiFiles: aiFiles.keys,
    buckets: buckets.names,
  };
};

export const cleanJunk = async () => {
  const scan = await scanJunk();

  for (const name of scan.containers) {
    await removeContainer(name);
  }
  for (const tag of scan.images) {
    await removeImage(tag);
  }
  await docker.pruneImages({ filters: { dangling: ["true"] } });
  await docker.pruneBuilder();
  await removeObjectsInBatches(DEPLOY_BUCKET, scan.artifacts);
  await removeObjectsInBatches(AI_BUCKET, scan.aiFiles);
  for (const name of scan.buckets) {
    await emptyAndRemoveBucket(name);
  }

  return { freedBytes: sum(scan.groups.map((group) => group.bytes)), groups: scan.groups };
};
