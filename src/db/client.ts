import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

export type DbClient = ReturnType<typeof drizzle>;

const MIGRATIONS_FOLDER = "./drizzle";

/**
 * Opens (or creates) a SQLite database and brings it up to date with the
 * checked-in migrations. Pass ":memory:" for an isolated test database.
 */
export function createDbClient(source: string): DbClient {
  const db = drizzle({ connection: { source, create: true } });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

let cachedDb: DbClient | undefined;

export function getDb(): DbClient {
  cachedDb ??= createDbClient(process.env.DB_FILE_NAME ?? "db.sqlite");
  return cachedDb;
}
