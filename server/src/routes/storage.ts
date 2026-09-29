import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  S3_REGION,
  createBucketCredentials,
  createPublicBucket,
  emptyAndRemoveBucket,
  listAllObjects,
  minio,
  minioBucketName,
  publicBaseUrl,
  publicObjectUrl,
  removeBucketCredentials,
  s3Endpoint,
} from "../lib/minio.js";
import { validate } from "../lib/validator.js";
import { createBucketSchema, listObjectsSchema, objectKeySchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import type { Bucket } from "@prisma/client";
import type { UserEnv } from "../lib/types.js";
import { LIMITS } from "../lib/limits.js";

const findBucket = (userId: string, id: string) => prisma.bucket.findFirst({ where: { id, userId } });

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
  .get("/buckets", async (c) => {
    const buckets = await prisma.bucket.findMany({
      where: { userId: c.get("user").id },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ buckets: buckets.map(summary), limit: LIMITS.buckets });
  })
  .post("/buckets", validate("json", createBucketSchema), async (c) => {
    const userId = c.get("user").id;
    const { name } = c.req.valid("json");

    const count = await prisma.bucket.count({ where: { userId } });
    if (count >= LIMITS.buckets) {
      return c.json({ error: `You can have at most ${LIMITS.buckets} buckets. Delete one to create another.` }, 400);
    }

    const existing = await prisma.bucket.findUnique({ where: { userId_name: { userId, name } } });
    if (existing) {
      return c.json({ error: "A bucket with this name already exists" }, 400);
    }

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const minioName = minioBucketName(id);
    await createPublicBucket(minioName);

    let credentials: Awaited<ReturnType<typeof createBucketCredentials>>;
    try {
      credentials = await createBucketCredentials(minioName);
    } catch (error) {
      await emptyAndRemoveBucket(minioName);
      throw error;
    }

    const bucket = await prisma.bucket.create({ data: { id, userId, name, minioName, ...credentials } });
    return c.json({ bucket: withCredentials(bucket) }, 201);
  })
  .delete("/buckets/:id", async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await removeBucketCredentials(bucket.accessKey);
    await emptyAndRemoveBucket(bucket.minioName);
    await prisma.bucket.delete({ where: { id: bucket.id } });
    return c.json({ message: "Bucket deleted" });
  })
  .post("/buckets/:id/rotate-keys", async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const credentials = await createBucketCredentials(bucket.minioName);
    await removeBucketCredentials(bucket.accessKey);
    const updated = await prisma.bucket.update({ where: { id: bucket.id }, data: credentials });
    return c.json({ bucket: withCredentials(updated) });
  })
  .get("/buckets/:id/objects", validate("query", listObjectsSchema), async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const objects = await listAllObjects(bucket.minioName, c.req.valid("query").prefix);
    return c.json({ bucket: withCredentials(bucket), objects });
  })
  .post("/buckets/:id/objects", async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
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
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await minio.removeObject(bucket.minioName, c.req.valid("query").key);
    return c.json({ message: "Object deleted" });
  });
