import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { emptyAndRemoveBucket, listAllObjects, minio, minioBucketName, presignedObjectUrl, publicObjectUrl, setBucketPublic } from "../lib/minio.js";
import { validate } from "../lib/validator.js";
import { createBucketSchema, listObjectsSchema, objectKeySchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

const findBucket = (userId: string, id: string) => prisma.bucket.findFirst({ where: { id, userId } });

export const storageRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/buckets", async (c) => {
    const buckets = await prisma.bucket.findMany({
      where: { userId: c.get("user").id },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ buckets });
  })
  .post("/buckets", validate("json", createBucketSchema), async (c) => {
    const userId = c.get("user").id;
    const { name, isPublic } = c.req.valid("json");

    const existing = await prisma.bucket.findUnique({ where: { userId_name: { userId, name } } });
    if (existing) {
      return c.json({ error: "A bucket with this name already exists" }, 400);
    }

    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    const minioName = minioBucketName(id);
    await minio.makeBucket(minioName);
    if (isPublic) {
      await setBucketPublic(minioName, true);
    }

    const bucket = await prisma.bucket.create({ data: { id, userId, name, minioName, isPublic } });
    return c.json({ bucket }, 201);
  })
  .patch("/buckets/:id", validate("json", createBucketSchema.pick({ isPublic: true })), async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const { isPublic } = c.req.valid("json");
    await setBucketPublic(bucket.minioName, isPublic);
    const updated = await prisma.bucket.update({ where: { id: bucket.id }, data: { isPublic } });
    return c.json({ bucket: updated });
  })
  .delete("/buckets/:id", async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await emptyAndRemoveBucket(bucket.minioName);
    await prisma.bucket.delete({ where: { id: bucket.id } });
    return c.json({ message: "Bucket deleted" });
  })
  .get("/buckets/:id/objects", validate("query", listObjectsSchema), async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const objects = await listAllObjects(bucket.minioName, c.req.valid("query").prefix);
    return c.json({ bucket, objects });
  })
  .post("/buckets/:id/objects", async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const body = await c.req.parseBody();
    const file = body.file;
    const prefix = typeof body.prefix === "string" ? body.prefix : "";
    if (!(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    const key = `${prefix}${file.name}`;
    await minio.putObject(bucket.minioName, key, Buffer.from(await file.arrayBuffer()), file.size, {
      "Content-Type": file.type || "application/octet-stream",
    });
    return c.json({ key }, 201);
  })
  .get("/buckets/:id/objects/url", validate("query", objectKeySchema), async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const { key } = c.req.valid("query");
    if (bucket.isPublic) {
      return c.json({ url: publicObjectUrl(bucket.minioName, key) });
    }
    const url = await presignedObjectUrl(bucket.minioName, key, 60 * 60);
    return c.json({ url });
  })
  .delete("/buckets/:id/objects", validate("query", objectKeySchema), async (c) => {
    const bucket = await findBucket(c.get("user").id, c.req.param("id"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await minio.removeObject(bucket.minioName, c.req.valid("query").key);
    return c.json({ message: "Object deleted" });
  });
