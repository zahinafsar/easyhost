import pg from "pg";

const connectionString = () => {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");
  return url.toString();
};

const createPool = () => {
  const url = connectionString();
  if (!url) {
    return null;
  }
  return new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 5 });
};

export const db = createPool();

export const query = async (text, params = []) => {
  if (!db) {
    throw new Error("Database is not configured");
  }
  const result = await db.query(text, params);
  return result.rows;
};
