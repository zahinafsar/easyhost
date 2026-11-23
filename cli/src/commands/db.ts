import { readFileSync } from "node:fs";
import pc from "picocolors";
import { json, request } from "../lib/api.js";
import { resolveProject, type ProjectOption } from "../lib/project.js";
import { confirmed, fail, formatBytes, log, output, table } from "../lib/ui.js";

type Database = { id: string; name: string; dbName: string; sizeBytes: number; createdAt: string };

type DatabaseDetail = Database & { connectionString: string; shadowConnectionString: string; limitBytes: number; blocked: boolean };

type QueryResult = { command: string; rowCount: number | null; columns: string[]; rows: Record<string, unknown>[]; truncated: boolean };

const findDatabase = async (options: ProjectOption) => {
  const project = await resolveProject(options);
  const { databases } = await request<{ databases: Database[] }>("/databases", {}, project.id);
  const database = databases[0];
  if (!database) {
    return fail("This project has no database yet. Create it with `ezhst db create <name>`.");
  }
  return { project, database };
};

export const databaseInfo = async (options: ProjectOption) => {
  const { project, database } = await findDatabase(options);
  const detail = await request<{ database: DatabaseDetail; tables: { name: string }[] }>(`/databases/${database.id}`, {}, project.id);
  output(detail, () => {
    const info = detail.database;
    log.info(`${pc.bold(info.name)} ${pc.dim(`(${info.dbName}, ${formatBytes(info.sizeBytes)} of ${formatBytes(info.limitBytes)} used)`)}`);
    if (info.blocked) {
      log.warn("Blocked: the database is over its size limit. Truncate or drop tables in the dashboard to free space.");
    }
    log.info(`DATABASE_URL:        ${info.connectionString}`);
    log.info(`SHADOW_DATABASE_URL: ${info.shadowConnectionString}`);
    log.info(`Tables: ${detail.tables.length}`);
    for (const item of detail.tables) {
      log.info(`  ${item.name}`);
    }
  });
};

export const createDatabase = async (name: string, options: ProjectOption) => {
  const project = await resolveProject(options);
  const { database } = await request<{ database: Database }>("/databases", json("POST", { name }), project.id);
  output({ database }, () => log.success(`Database ${database.name} created. Run \`ezhst db info\` for the connection string.`));
};

export const queryDatabase = async (sql: string | undefined, options: ProjectOption & { file?: string }) => {
  let text = sql;
  if (options.file) {
    text = readFileSync(options.file, "utf8");
  }
  if (!text) {
    return fail("Pass the SQL as an argument or with --file <file.sql>.");
  }
  const { project, database } = await findDatabase(options);
  const { result } = await request<{ result: QueryResult }>(`/databases/${database.id}/query`, json("POST", { sql: text }), project.id);
  output({ result }, () => {
    if (result.columns.length) {
      table(result.rows);
    }
    log.dim(`${result.command} ${result.rowCount ?? 0}`);
    if (result.truncated) {
      log.warn("Output truncated.");
    }
  });
};

export const tableRows = async (tableName: string, options: ProjectOption & { page?: string }) => {
  const { project, database } = await findDatabase(options);
  const query = new URLSearchParams({ page: options.page ?? "1" });
  const data = await request<{ rows: Record<string, unknown>[]; total: number; page: number }>(
    `/databases/${database.id}/tables/${encodeURIComponent(tableName)}/rows?${query}`,
    {},
    project.id,
  );
  output(data, () => {
    table(data.rows);
    log.dim(`Page ${data.page}, ${data.total} rows total`);
  });
};

export const resetDatabasePassword = async (options: ProjectOption) => {
  const { project, database } = await findDatabase(options);
  const result = await request<{ connectionString: string }>(`/databases/${database.id}/reset-password`, { method: "POST" }, project.id);
  output(result, () => {
    log.success("Password rotated. Update DATABASE_URL in your env and redeploy.");
    log.info(result.connectionString);
  });
};

export const deleteDatabase = async (options: ProjectOption & { yes?: boolean }) => {
  const { project, database } = await findDatabase(options);
  confirmed(options.yes, `Deleting database ${database.name} removes all of its data.`);
  const result = await request<{ message: string }>(`/databases/${database.id}`, { method: "DELETE" }, project.id);
  output(result, () => log.success("Database deleted"));
};
