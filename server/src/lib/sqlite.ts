import Database from "better-sqlite3";
import { mkdirSync, rmSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { env } from "./env.js";

const SQLITE_DIR = path.resolve(env.sqliteDir);
const MAX_ROWS = 1000;

mkdirSync(SQLITE_DIR, { recursive: true });

export const sqlitePath = (dbId: string) => path.join(SQLITE_DIR, `${dbId}.db`);

const openDatabase = (dbId: string) => {
  const db = new Database(sqlitePath(dbId));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
};

export const createSqliteFile = (dbId: string) => {
  openDatabase(dbId).close();
};

export const removeSqliteFile = (dbId: string) => {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(`${sqlitePath(dbId)}${suffix}`, { force: true });
  }
};

export const sqliteSize = (dbId: string) => {
  const file = sqlitePath(dbId);
  if (!existsSync(file)) {
    return 0;
  }
  return statSync(file).size;
};

type QueryParam = string | number | boolean | null;

export const runQuery = (dbId: string, sql: string, params: QueryParam[] = []) => {
  const db = openDatabase(dbId);
  const normalized = params.map((param) => {
    if (typeof param === "boolean") {
      return param ? 1 : 0;
    }
    return param;
  });

  try {
    let statement;
    try {
      statement = db.prepare(sql);
    } catch (error) {
      if (error instanceof RangeError && !normalized.length) {
        db.exec(sql);
        return { columns: [], rows: [], changes: null, truncated: false };
      }
      throw error;
    }

    if (statement.reader) {
      const columns = statement.columns().map((column) => column.name);
      const rows: unknown[] = [];
      let truncated = false;
      for (const row of statement.iterate(...normalized)) {
        if (rows.length >= MAX_ROWS) {
          truncated = true;
          break;
        }
        rows.push(row);
      }
      return { columns, rows, changes: null, truncated };
    }

    const info = statement.run(...normalized);
    return {
      columns: [],
      rows: [],
      changes: info.changes,
      lastInsertRowid: Number(info.lastInsertRowid),
      truncated: false,
    };
  } finally {
    db.close();
  }
};

export const listTables = (dbId: string) => {
  const db = openDatabase(dbId);
  try {
    return db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string; sql: string }[];
  } finally {
    db.close();
  }
};
