import { Hono } from "hono";
import { prisma } from "../../lib/prisma.js";
import { runQuery } from "../../lib/sqlite.js";
import { validate } from "../../lib/validator.js";
import { runQuerySchema } from "../../lib/validations.js";
import { requireApiKey } from "../../middleware/require-api-key.js";
import type { ApiKeyEnv } from "../../lib/types.js";

export const v1DatabaseRoutes = new Hono<ApiKeyEnv>()
  .use(requireApiKey)
  .post("/:name/query", validate("json", runQuerySchema), async (c) => {
    const database = await prisma.sqliteDatabase.findFirst({
      where: { userId: c.get("userId"), name: c.req.param("name") },
    });
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    const { sql, params } = c.req.valid("json");
    try {
      return c.json({ result: runQuery(database.id, sql, params) });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Query failed" }, 400);
    }
  });
