import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { generateApiKey } from "../lib/api-key.js";
import { validate } from "../lib/validator.js";
import { createApiKeySchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import { requireProject } from "../middleware/require-project.js";
import type { UserEnv } from "../lib/types.js";

const apiKeySelect = { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true };

export const apiKeyRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/", async (c) => {
    const apiKeys = await prisma.apiKey.findMany({
      where: { projectId: c.get("projectId") },
      select: apiKeySelect,
      orderBy: { createdAt: "desc" },
    });
    return c.json({ apiKeys });
  })
  .post("/", validate("json", createApiKeySchema), async (c) => {
    const { key, prefix, hash } = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: { projectId: c.get("projectId"), name: c.req.valid("json").name, prefix, hash },
      select: apiKeySelect,
    });
    return c.json({ apiKey, key }, 201);
  })
  .delete("/:id", async (c) => {
    const { count } = await prisma.apiKey.deleteMany({
      where: { id: c.req.param("id"), projectId: c.get("projectId") },
    });
    if (!count) {
      return c.json({ error: "API key not found" }, 404);
    }
    return c.json({ message: "API key revoked" });
  });
