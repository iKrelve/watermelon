import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { sql } from 'drizzle-orm'

let db: BetterSQLite3Database<typeof schema> | null = null
let sqliteDb: Database.Database | null = null

/**
 * Initialize the database at the given path.
 * Creates tables if they don't exist.
 * In production, use `app.getPath('userData')` for the dbPath.
 */
export function initDatabase(dbPath: string): BetterSQLite3Database<typeof schema> {
  if (db) return db

  sqliteDb = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  sqliteDb.pragma('journal_mode = WAL')
  // Enable foreign keys
  sqliteDb.pragma('foreign_keys = ON')

  db = drizzle(sqliteDb, { schema })

  // Create tables using raw SQL (drizzle push equivalent)
  createTables(sqliteDb)

  return db
}

/**
 * Initialize an in-memory database for testing.
 */
export function initTestDatabase(): BetterSQLite3Database<typeof schema> {
  const testSqliteDb = new Database(':memory:')
  testSqliteDb.pragma('foreign_keys = ON')

  const testDb = drizzle(testSqliteDb, { schema })
  createTables(testSqliteDb)

  return testDb
}

/**
 * Get the current database instance.
 * Throws if not initialized.
 */
export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close()
    sqliteDb = null
    db = null
  }
}

/**
 * Get the raw SQLite database for direct operations (transactions, etc.)
 */
export function getRawDatabase(): Database.Database | null {
  return sqliteDb
}

function createTables(sqliteDb: Database.Database): void {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'completed')),
      priority TEXT NOT NULL DEFAULT 'none' CHECK(priority IN ('none', 'low', 'medium', 'high')),
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      due_date TEXT,
      reminder_time TEXT,
      recurrence_rule TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_sub_tasks_task_id ON sub_tasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
  `)
}

export { schema }
export type { BetterSQLite3Database }
