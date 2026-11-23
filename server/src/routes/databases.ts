import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import {
  clearTable,
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
import { clearTableSchema, createDatabaseSchema, runQuerySchema, tableRowsQuerySchema, updateCellSchema } from "../lib/validations.js";
import { enforceProject, projectEntitlement } from "../lib/billing.js";
import { requireUser } from "../middleware/require-user.js";
import { restartAiApps } from "../lib/ai-apps.js";
import { requireProject } from "../middleware/require-project.js";
import type { UserEnv } from "../lib/types.js";

const publicFields = { id: true, name: true, dbName: true, blocked: true, createdAt: true, updatedAt: true };

const BLOCKED_ERROR = "This database is over its size limit and is blocked. Truncate or drop tables to free space.";

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
    const [sizes, entitlement] = await Promise.all([
      databaseSizes(databases.map((database) => database.dbName)),
      projectEntitlement(c.get("projectId")),
    ]);
    return c.json({
      databases: databases.map((database) => ({ ...database, sizeBytes: sizes.get(database.dbName) ?? 0 })),
      limit: 1,
      limitBytes: entitlement.limits.dbBytes,
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

    const [sizes, tables, entitlement] = await Promise.all([
      databaseSizes([database.dbName]),
      listTables(database),
      projectEntitlement(c.get("projectId")),
    ]);
    return c.json({
      database: {
        id: database.id,
        name: database.name,
        dbName: database.dbName,
        createdAt: database.createdAt,
        updatedAt: database.updatedAt,
        sizeBytes: sizes.get(database.dbName) ?? 0,
        limitBytes: entitlement.limits.dbBytes,
        blocked: database.blocked,
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
    if (database.blocked) {
      return c.json({ error: BLOCKED_ERROR }, 402);
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
    if (database.blocked) {
      return c.json({ error: BLOCKED_ERROR }, 402);
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
    if (database.blocked) {
      return c.json({ error: BLOCKED_ERROR }, 402);
    }

    const { key, column, value } = c.req.valid("json");
    try {
      await updateTableCell(database, c.req.param("table"), key, column, value);
      return c.json({ message: "Saved" });
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
  })
  .post("/:id/tables/:table/clear", validate("json", clearTableSchema), async (c) => {
    const database = await findDatabase(c.get("projectId"), c.req.param("id"));
    if (!database) {
      return c.json({ error: "Database not found" }, 404);
    }

    try {
      await clearTable(database.dbName, c.req.param("table"), c.req.valid("json").mode);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 400);
    }
    await enforceProject(c.get("projectId"), { quotas: false });
    return c.json({ message: "Table cleared" });
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
