import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  connectionString,
  createUserDatabase,
  databaseSizes,
  dropUserDatabase,
  generateCredentials,
  listTables,
  readTableRows,
  rotatePassword,
  runQuery,
  shadowConnectionString,
  updateTableCell,
} from "../lib/userdb.js";
import { validate } from "../lib/validator.js";
import { createDatabaseSchema, runQuerySchema, tableRowsQuerySchema, updateCellSchema } from "../lib/validations.js";
import { requireUser } from "../middleware/require-user.js";
import { restartAiApps } from "../lib/ai-apps.js";
import { requireProject } from "../middleware/require-project.js";
import type { UserEnv } from "../lib/types.js";

const publicFields = { id: true, name: true, dbName: true, createdAt: true, updatedAt: true };

const findDatabase = (projectId: string, id: string) => prisma.database.findFirst({ where: { id, projectId } });

const errorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return "Query failed";
};

export const databaseRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .use(requireProject)
  .get("/", async (c) => {
    const databases = await prisma.database.findMany({
      where: { projectId: c.get("projectId") },
      orderBy: { createdAt: "desc" },
      select: publicFields,
    });
    const sizes = await databaseSizes(databases.map((database) => database.dbName));
    return c.json({
      databases: databases.map((database) => ({ ...database, sizeBytes: sizes.get(database.dbName) ?? 0 })),
      limit: 1,
    });
  })
  .post("/", validate("json", createDatabaseSchema), async (c) => {
    const projectId = c.get("projectId");
    const { name } = c.req.valid("json");

    const existing = await prisma.database.findUnique({ where: { projectId } });
    if (existing) {
      return c.json({ error: "This project already has a database" }, 400);
    }

    const credentials = generateCredentials();
    await createUserDatabase(credentials);
    const database = await prisma.database.create({
      data: { projectId, name, ...credentials },
      select: publicFields,
    });
    return c.json({ database }, 201);
  })
  .get("/:id", async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    const [sizes, tables] = await Promise.all([databaseSizes([database.dbName]), listTables(database)]);
    return c.json({
      database: {
        id: database.id,
        name: database.name,
        dbName: database.dbName,
        createdAt: database.createdAt,
        updatedAt: database.updatedAt,
        sizeBytes: sizes.get(database.dbName) ?? 0,
        connectionString: connectionString(database),
        shadowConnectionString: shadowConnectionString(database),
      },
      tables,
    });
  })
  .post("/:id/query", validate("json", runQuerySchema), async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    try {
      const result = await runQuery(database, c.req.valid("json").sql);
      return c.json({ result });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  })
  .get("/:id/tables/:table/rows", validate("query", tableRowsQuerySchema), async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    try {
      const data = await readTableRows(database, c.req.param("table"), c.req.valid("query").page);
      return c.json(data);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  })
  .patch("/:id/tables/:table/rows", validate("json", updateCellSchema), async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    const { key, column, value } = c.req.valid("json");
    try {
      await updateTableCell(database, c.req.param("table"), key, column, value);
      return c.json({ message: "Saved" });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  })
  .post("/:id/reset-password", async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    const password = await rotatePassword(database.roleName);
    const updated = await prisma.database.update({ where: { id: database.id }, data: { password } });
    await restartAiApps(database.id);
    return c.json({ connectionString: connectionString(updated) });
  })
  .delete("/:id", async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    await dropUserDatabase(database);
    await prisma.database.delete({ where: { id: database.id } });
    return c.json({ message: "Database deleted" });
  });
