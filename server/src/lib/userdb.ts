import pg from "pg";
import { randomBytes } from "node:crypto";
import { env } from "./env.js";

const CONNECTION_LIMIT = 20;
const MAX_ROWS = 1000;
const STATEMENT_TIMEOUT_MS = 15_000;

const adminUrl = new URL(env.userdb.url);
const ssl = { rejectUnauthorized: false };

export type DatabaseCredentials = {
  dbName: string;
  roleName: string;
  password: string;
};

const withClient = async <T>(config: pg.ClientConfig, run: (client: pg.Client) => Promise<T>) => {
  const client = new pg.Client({ ...config, ssl, statement_timeout: STATEMENT_TIMEOUT_MS });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
};

const asAdmin = <T>(run: (client: pg.Client) => Promise<T>) => withClient({ connectionString: env.userdb.url }, run);

const asOwner = <T>(credentials: DatabaseCredentials, run: (client: pg.Client) => Promise<T>) => {
  return withClient(
    {
      host: adminUrl.hostname,
      port: Number(adminUrl.port),
      user: credentials.roleName,
      password: credentials.password,
      database: credentials.dbName,
    },
    run,
  );
};

const newPassword = () => randomBytes(24).toString("hex");

export const generateCredentials = (): DatabaseCredentials => {
  const id = randomBytes(8).toString("hex");
  return { dbName: `db_${id}`, roleName: `u_${id}`, password: newPassword() };
};

const shadowName = (dbName: string) => `${dbName}_shadow`;

export const createUserDatabase = async ({ dbName, roleName, password }: DatabaseCredentials) => {
  await asAdmin(async (client) => {
    await client.query(`CREATE ROLE "${roleName}" LOGIN PASSWORD '${password}' CONNECTION LIMIT ${CONNECTION_LIMIT}`);
    for (const name of [dbName, shadowName(dbName)]) {
      await client.query(`CREATE DATABASE "${name}" OWNER "${roleName}"`);
      await client.query(`REVOKE ALL ON DATABASE "${name}" FROM PUBLIC`);
    }
  });
};

export const dropUserDatabase = async ({ dbName, roleName }: Pick<DatabaseCredentials, "dbName" | "roleName">) => {
  await asAdmin(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await client.query(`DROP DATABASE IF EXISTS "${shadowName(dbName)}" WITH (FORCE)`);
    await client.query(`DROP ROLE IF EXISTS "${roleName}"`);
  });
};

export const rotatePassword = async (roleName: string) => {
  const password = newPassword();
  await asAdmin((client) => client.query(`ALTER ROLE "${roleName}" PASSWORD '${password}'`));
  return password;
};

export const databaseSizes = async (dbNames: string[]) => {
  if (!dbNames.length) {
    return new Map<string, number>();
  }
  const rows = await asAdmin(async (client) => {
    const result = await client.query<{ datname: string; size: string }>(
      "SELECT datname, pg_database_size(datname) AS size FROM pg_database WHERE datname = ANY($1)",
      [dbNames],
    );
    return result.rows;
  });
  return new Map(rows.map((row) => [row.datname, Number(row.size)]));
};

export const listTables = (credentials: DatabaseCredentials) => {
  return asOwner(credentials, async (client) => {
    const result = await client.query<{ name: string }>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    return result.rows;
  });
};

export const runQuery = (credentials: DatabaseCredentials, sql: string) => {
  return asOwner(credentials, async (client) => {
    const raw = (await client.query(sql)) as unknown as pg.QueryResult | pg.QueryResult[];
    let result = raw as pg.QueryResult;
    if (Array.isArray(raw)) {
      result = raw[raw.length - 1];
    }
    const rows = result.rows ?? [];
    return {
      command: result.command,
      rowCount: result.rowCount,
      columns: (result.fields ?? []).map((field) => field.name),
      rows: rows.slice(0, MAX_ROWS),
      truncated: rows.length > MAX_ROWS,
    };
  });
};

export const ROWS_PAGE_SIZE = 50;

const quoteIdent = (value: string) => `"${value.replace(/"/g, '""')}"`;

type TableColumn = { name: string; type: string; nullable: boolean; isPrimaryKey: boolean };

const describeTable = async (client: pg.Client, table: string) => {
  const columns = await client.query<{ name: string; type: string; nullable: string }>(
    `SELECT column_name AS name, data_type AS type, is_nullable AS nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  if (!columns.rows.length) {
    throw new Error(`Table "${table}" not found`);
  }

  const primaryKey = await client.query<{ name: string }>(
    `SELECT a.attname AS name
     FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    [`public.${quoteIdent(table)}`],
  );
  const primaryKeyNames = primaryKey.rows.map((row) => row.name);

  const result: TableColumn[] = columns.rows.map((column) => ({
    name: column.name,
    type: column.type,
    nullable: column.nullable === "YES",
    isPrimaryKey: primaryKeyNames.includes(column.name),
  }));
  return { columns: result, primaryKey: primaryKeyNames };
};

export const readTableRows = (credentials: DatabaseCredentials, table: string, page: number) => {
  return asOwner(credentials, async (client) => {
    const { columns, primaryKey } = await describeTable(client, table);
    const selectList = columns.map((column) => `${quoteIdent(column.name)}::text AS ${quoteIdent(column.name)}`).join(", ");
    let orderBy = "";
    if (primaryKey.length) {
      orderBy = `ORDER BY ${primaryKey.map(quoteIdent).join(", ")}`;
    }

    const [rows, count] = await Promise.all([
      client.query<Record<string, string | null>>(
        `SELECT ${selectList} FROM public.${quoteIdent(table)} ${orderBy} LIMIT $1 OFFSET $2`,
        [ROWS_PAGE_SIZE, (page - 1) * ROWS_PAGE_SIZE],
      ),
      client.query<{ total: string }>(`SELECT count(*) AS total FROM public.${quoteIdent(table)}`),
    ]);

    return {
      columns,
      primaryKey,
      rows: rows.rows,
      total: Number(count.rows[0].total),
      page,
      pageSize: ROWS_PAGE_SIZE,
    };
  });
};

export const updateTableCell = (
  credentials: DatabaseCredentials,
  table: string,
  key: Record<string, string | null>,
  column: string,
  value: string | null,
) => {
  return asOwner(credentials, async (client) => {
    const { columns, primaryKey } = await describeTable(client, table);
    if (!primaryKey.length) {
      throw new Error("This table has no primary key, so rows cannot be edited here");
    }
    if (!columns.some((item) => item.name === column)) {
      throw new Error(`Column "${column}" not found`);
    }
    const missingKey = primaryKey.filter((name) => !(name in key));
    if (missingKey.length) {
      throw new Error(`Missing primary key value for ${missingKey.join(", ")}`);
    }

    const where = primaryKey.map((name, index) => `${quoteIdent(name)} = $${index + 2}`).join(" AND ");
    const result = await client.query(
      `UPDATE public.${quoteIdent(table)} SET ${quoteIdent(column)} = $1 WHERE ${where}`,
      [value, ...primaryKey.map((name) => key[name])],
    );
    if (result.rowCount !== 1) {
      throw new Error("Row not found. It may have been changed or deleted.");
    }
  });
};

export const connectionString = ({ dbName, roleName, password }: DatabaseCredentials) => {
  return `postgresql://${roleName}:${password}@${env.userdb.publicHost}:${env.userdb.publicPort}/${dbName}?sslmode=${env.userdb.publicSslMode}`;
};

export const shadowConnectionString = (credentials: DatabaseCredentials) => {
  return connectionString({ ...credentials, dbName: shadowName(credentials.dbName) });
};
