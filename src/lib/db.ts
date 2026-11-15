import "server-only";
import fs from "fs";
import path from "path";

/**
 * One tiny query interface over two drivers:
 *  - DATABASE_URL set → node-postgres (Supabase, Neon, any hosted Postgres)
 *  - otherwise        → PGlite, real Postgres compiled to WASM, stored in ./.data (zero setup locally)
 * Every query is parameterized ($1, $2…); never build SQL from user input.
 */
export type Row = Record<string, any>;
export interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

const g = globalThis as unknown as { __cicDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__cicDb) g.__cicDb = connect();
  return g.__cicDb;
}

export async function q<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db()).query<T>(sql, params);
}

export async function one<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await q<T>(sql, params))[0] ?? null;
}

async function connect(): Promise<Db> {
  let database: Db;
  let exec: (sql: string) => Promise<unknown>;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
    database = { query: async (sql, params) => (await pool.query(sql, params as any[])).rows };
    exec = (sql) => pool.query(sql);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    const lite = new PGlite(dir);
    database = { query: async (sql, params) => (await lite.query(sql, params as any[])).rows as any[] };
    exec = (sql) => lite.exec(sql);
  }
  await exec(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
  const [{ n }] = await database.query<{ n: number }>("SELECT count(*)::int AS n FROM users");
  if (n === 0 && process.env.SEED_DEMO_DATA !== "false") {
    const { seed } = await import("./seed");
    await seed(database);
  }
  return database;
}
