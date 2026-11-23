import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  S3_REGION,
  bucketSize,
  createBucketCredentials,
  createProjectBucket,
  emptyAndRemoveBucket,
  listAllObjects,
  minio,
  publicBaseUrl,
  publicObjectUrl,
  removeBucketCredentials,
  s3Endpoint,
} from "../lib/minio.js";
import { projectEntitlement } from "../lib/billing.js";
import { validate } from "../lib/validator.js";
import { createBucketSchema, listObjectsSchema, objectKeySchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import { requireProject } from "../middleware/require-project.js";
import type { Bucket } from "@prisma/client";
import type { UserEnv } from "../lib/types.js";

const findBucket = (projectId: string, id: string) => prisma.bucket.findFirst({ where: { id, projectId } });

const summary = (bucket: Bucket) => ({
  id: bucket.id,
  name: bucket.name,
  minioName: bucket.minioName,
  baseUrl: publicBaseUrl(bucket.minioName),
  createdAt: bucket.createdAt,
});

const withCredentials = (bucket: Bucket) => ({
  ...summary(bucket),
  s3: {
    endpoint: s3Endpoint(),
    region: S3_REGION,
    bucket: bucket.minioName,
    accessKeyId: bucket.accessKey,
    secretAccessKey: bucket.secretKey,
  },
});

export const storageRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/buckets", async (c) => {
    const buckets = await prisma.bucket.findMany({
      where: { projectId: c.get("projectId") },
      orderBy: { createdAt: "desc" },
    });
    const entitlement = await projectEntitlement(c.get("projectId"));
    let usedBytes = 0;
    for (const bucket of buckets) {
      usedBytes += await bucketSize(bucket.minioName);
    }
    return c.json({ buckets: buckets.map(summary), limit: 1, usedBytes, limitBytes: entitlement.limits.storageBytes });
  })
  .post("/buckets", validate("json", createBucketSchema), async (c) => {
    const projectId = c.get("projectId");
    const { name } = c.req.valid("json");

    const existing = await prisma.bucket.findUnique({ where: { projectId } });
    if (existing) {
      return c.json({ error: "This project already has storage" }, 400);
    }

    const entitlement = await projectEntitlement(projectId);
    const bucket = await createProjectBucket(projectId, name, entitlement.limits.storageBytes);
    return c.json({ bucket: withCredentials(bucket) }, 201);
  })
  .delete("/buckets/:id", async (c) => {
    const bucket = await findBucket(c.get("projectId"), c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await removeBucketCredentials(bucket.accessKey);
    await emptyAndRemoveBucket(bucket.minioName);
    await prisma.bucket.delete({ where: { id: bucket.id } });
    return c.json({ message: "Bucket deleted" });
  })
  .post("/buckets/:id/rotate-keys", async (c) => {
    const bucket = await findBucket(c.get("projectId"), c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const credentials = await createBucketCredentials(bucket.minioName);
    await removeBucketCredentials(bucket.accessKey);
    const updated = await prisma.bucket.update({ where: { id: bucket.id }, data: credentials });
    return c.json({ bucket: withCredentials(updated) });
  })
  .get("/buckets/:id/objects", validate("query", listObjectsSchema), async (c) => {
    const bucket = await findBucket(c.get("projectId"), c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const objects = await listAllObjects(bucket.minioName, c.req.valid("query").prefix);
    return c.json({ bucket: withCredentials(bucket), objects });
  })
  .post("/buckets/:id/objects", async (c) => {
    const bucket = await findBucket(c.get("projectId"), c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const body = await c.req.parseBody();
    const file = body.file;
    let prefix = "";
    if (typeof body.prefix === "string") {
      prefix = body.prefix;
    }
    if (!(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    const key = `${prefix}${file.name}`;
    await minio.putObject(bucket.minioName, key, Buffer.from(await file.arrayBuffer()), file.size, {
      "Content-Type": file.type || "application/octet-stream",
    });
    return c.json({ key, url: publicObjectUrl(bucket.minioName, key) }, 201);
  })
  .delete("/buckets/:id/objects", validate("query", objectKeySchema), async (c) => {
    const bucket = await findBucket(c.get("projectId"), c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await minio.removeObject(bucket.minioName, c.req.valid("query").key);
    return c.json({ message: "Object deleted" });
  });
