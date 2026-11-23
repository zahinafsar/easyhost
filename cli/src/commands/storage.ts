import { openAsBlob, writeFileSync } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { json, request } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { confirmed, fail, formatBytes, log, output } from "../lib/ui.js";

type Bucket = { id: string; name: string; minioName: string; baseUrl: string; createdAt: string };

type BucketWithCredentials = Bucket & {
  s3: { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string };
};

type StorageObject = { key: string; size: number; lastModified: string | null; isFolder: boolean; url: string | null };

const findBucket = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  const { buckets, usedBytes, limitBytes } = await request<{ buckets: Bucket[]; usedBytes: number; limitBytes: number }>(
    "/storage/buckets",
    {},
    project.id,
  );
  const bucket = buckets[0];
  if (!bucket) {
    return fail("This project has no storage yet. Create it with `ezhst storage create <name>`.");
  }
  return { project, bucket, usedBytes, limitBytes };
};

const listObjects = async (projectId: string, bucketId: string, prefix = "") => {
  const query = new URLSearchParams({ prefix });
  return request<{ bucket: BucketWithCredentials; objects: StorageObject[] }>(
    `/storage/buckets/${bucketId}/objects?${query}`,
    {},
    projectId,
  );
};

const printCredentials = (bucket: BucketWithCredentials) => {
  log.info(`${pc.bold(bucket.name)} ${pc.dim(`(${bucket.minioName})`)}`);
  log.info(`Public URL:        ${bucket.baseUrl}/<key>`);
  log.info(`S3 endpoint:       ${bucket.s3.endpoint}`);
  log.info(`Region:            ${bucket.s3.region}`);
  log.info(`Bucket:            ${bucket.s3.bucket}`);
  log.info(`Access key ID:     ${bucket.s3.accessKeyId}`);
  log.info(`Secret access key: ${bucket.s3.secretAccessKey}`);
  log.dim("Use path-style addressing (forcePathStyle: true).");
};

export const storageInfo = async (options: ProjectOption) => {
  const { project, bucket, usedBytes, limitBytes } = await findBucket(options);
  const { bucket: detail } = await listObjects(project.id, bucket.id);
  output({ bucket: detail, usedBytes, limitBytes }, () => {
    printCredentials(detail);
    log.info(`Used: ${formatBytes(usedBytes)} of ${formatBytes(limitBytes)}`);
  });
};

export const createStorage = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { bucket } = await request<{ bucket: BucketWithCredentials }>("/storage/buckets", json("POST", { name }), project.id);
  output({ bucket }, () => {
    log.success("Storage created");
    printCredentials(bucket);
  });
};

export const rotateStorageKeys = async (options: ProjectOption) => {
  const { project, bucket } = await findBucket(options);
  const result = await request<{ bucket: BucketWithCredentials }>(
    `/storage/buckets/${bucket.id}/rotate-keys`,
    { method: "POST" },
    project.id,
  );
  output(result, () => {
    log.success("Keys rotated. The old keys no longer work.");
    printCredentials(result.bucket);
  });
};

export const listStorage = async (prefix: string | undefined, options: ProjectOption) => {
  const { project, bucket } = await findBucket(options);
  const { objects } = await listObjects(project.id, bucket.id, prefix);
  output({ objects }, () => {
    if (!objects.length) {
      log.info("No files.");
      return;
    }
    for (const object of objects) {
      if (object.isFolder) {
        log.info(pc.bold(object.key));
        continue;
      }
      log.info(`${object.key.padEnd(48)} ${formatBytes(object.size).padStart(10)}  ${pc.dim(object.url ?? "")}`);
    }
  });
};

export const uploadStorage = async (files: string[], options: ProjectOption & { prefix?: string }) => {
  const { project, bucket } = await findBucket(options);
  const uploaded: { key: string; url: string }[] = [];
  for (const file of files) {
    const form = new FormData();
    form.append("file", await openAsBlob(file), path.basename(file));
    if (options.prefix) {
      form.append("prefix", options.prefix);
    }
    const result = await request<{ key: string; url: string }>(
      `/storage/buckets/${bucket.id}/objects`,
      { method: "POST", body: form },
      project.id,
    );
    uploaded.push(result);
    log.success(`Uploaded ${result.key}: ${result.url}`);
  }
  output({ uploaded }, () => undefined);
};

export const downloadStorage = async (key: string, destination: string | undefined, options: ProjectOption) => {
  const { bucket } = await findBucket(options);
  const url = `${bucket.baseUrl}/${encodeURI(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    fail(`Could not download ${key} (status ${res.status}).`);
  }
  const target = destination ?? path.basename(key);
  writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  output({ key, path: target }, () => log.success(`Saved ${key} to ${target}`));
};

export const removeStorageObject = async (key: string, options: ProjectOption) => {
  const { project, bucket } = await findBucket(options);
  const query = new URLSearchParams({ key });
  const result = await request<{ message: string }>(
    `/storage/buckets/${bucket.id}/objects?${query}`,
    { method: "DELETE" },
    project.id,
  );
  output(result, () => log.success(`Deleted ${key}`));
};

export const deleteStorage = async (options: ProjectOption & { yes?: boolean }) => {
  const { project, bucket } = await findBucket(options);
  confirmed(options.yes, `Deleting storage ${bucket.name} removes every file in it.`);
  const result = await request<{ message: string }>(`/storage/buckets/${bucket.id}`, { method: "DELETE" }, project.id);
  output(result, () => log.success("Storage deleted"));
};
