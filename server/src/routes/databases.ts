import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { createSqliteFile, listTables, removeSqliteFile, runQuery, sqliteSize } from "../lib/sqlite.js";
import { validate } from "../lib/validator.js";
import { createDatabaseSchema, runQuerySchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

const findDatabase = (userId: string, id: string) => prisma.sqliteDatabase.findFirst({ where: { id, userId } });

export const databaseRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const databases = await prisma.sqliteDatabase.findMany({
      where: { userId: c.get("user").id },
      orderBy: { createdAt: "desc" },
    });
    return c.json({
      databases: databases.map((database) => ({ ...database, sizeBytes: sqliteSize(database.id) })),
    });
  })
  .post("/", validate("json", createDatabaseSchema), async (c) => {
    const userId = c.get("user").id;
    const { name } = c.req.valid("json");

    const existing = await prisma.sqliteDatabase.findUnique({ where: { userId_name: { userId, name } } });
    if (existing) {
      return c.json({ error: "A database with this name already exists" }, 400);
    }

    const database = await prisma.sqliteDatabase.create({ data: { userId, name } });
    createSqliteFile(database.id);
    return c.json({ database }, 201);
  })
  .get("/:id", async (c) => {
    const database = await findDatabase(c.get("user").id, c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }
    return c.json({
      database: { ...database, sizeBytes: sqliteSize(database.id) },
      tables: listTables(database.id),
    });
  })
  .post("/:id/query", validate("json", runQuerySchema), async (c) => {
    const database = await findDatabase(c.get("user").id, c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    const { sql, params } = c.req.valid("json");
    try {
      const result = runQuery(database.id, sql, params);
      await prisma.sqliteDatabase.update({ where: { id: database.id }, data: { updatedAt: new Date() } });
      return c.json({ result });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : "Query failed" }, 400);
    }
  })
  .delete("/:id", async (c) => {
    const database = await findDatabase(c.get("user").id, c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    await prisma.sqliteDatabase.delete({ where: { id: database.id } });
    removeSqliteFile(database.id);
    return c.json({ message: "Database deleted" });
  });
