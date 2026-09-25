import { Hono } from "hono";
import { Readable } from "node:stream";
import { prisma } from "../../lib/prisma.js";
import { listAllObjects, minio } from "../../lib/minio.js";
import { validate } from "../../lib/validator.js";
import { listObjectsSchema } from "../../lib/validations.js";
import { requireApiKey } from "../../middleware/require-api-key.js";
import type { ApiKeyEnv } from "../../lib/types.js";

const findBucket = (userId: string, name: string) => prisma.bucket.findFirst({ where: { userId, name } });

const objectKey = (path: string, bucket: string) => decodeURIComponent(path.split(`/storage/${bucket}/`)[1] ?? "");

export const v1StorageRoutes = new Hono<ApiKeyEnv>()
  .use(requireApiKey)
  .get("/:bucket", validate("query", listObjectsSchema), async (c) => {
    const bucket = await findBucket(c.get("userId"), c.req.param("bucket"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }
    const objects = await listAllObjects(bucket.minioName, c.req.valid("query").prefix);
    return c.json({ objects });
  })
  .put("/:bucket/*", async (c) => {
    const bucket = await findBucket(c.get("userId"), c.req.param("bucket"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const key = objectKey(c.req.path, bucket.name);
    if (!key) {
      return c.json({ error: "Object key is required" }, 400);
    }

    const body = Buffer.from(await c.req.arrayBuffer());
    await minio.putObject(bucket.minioName, key, body, body.length, {
      "Content-Type": c.req.header("content-type") || "application/octet-stream",
    });
    return c.json({ key, size: body.length }, 201);
  })
  .get("/:bucket/*", async (c) => {
    const bucket = await findBucket(c.get("userId"), c.req.param("bucket"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    const key = objectKey(c.req.path, bucket.name);
    try {
      const stat = await minio.statObject(bucket.minioName, key);
      const stream = await minio.getObject(bucket.minioName, key);
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          "Content-Type": stat.metaData["content-type"] || "application/octet-stream",
          "Content-Length": String(stat.size),
        },
      });
    } catch {
      return c.json({ error: "Object not found" }, 404);
    }
  })
  .delete("/:bucket/*", async (c) => {
    const bucket = await findBucket(c.get("userId"), c.req.param("bucket"));
    if (!bucket) {
      return c.json({ error: "Bucket not found" }, 404);
    }

    await minio.removeObject(bucket.minioName, objectKey(c.req.path, bucket.name));
    return c.json({ message: "Object deleted" });
  });
