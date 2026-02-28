import { Database } from 'bun:sqlite'
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

let db: BunSQLiteDatabase<typeof schema> | null = null
let sqliteDb: Database | null = null

/**
 * Initialize the database at the given path.
 * Creates tables if they don't exist.
 * In production, use `Utils.paths.userData` for the dbPath.
 */
export function initDatabase(dbPath: string): BunSQLiteDatabase<typeof schema> {
  if (db) return db

  sqliteDb = new Database(dbPath, { create: true })

  // Enable WAL mode for better concurrent read performance
  sqliteDb.exec('PRAGMA journal_mode = WAL')
  // Enable foreign keys
  sqliteDb.exec('PRAGMA foreign_keys = ON')

  db = drizzle(sqliteDb, { schema })

  // Create tables using raw SQL (drizzle push equivalent)
  createTables(sqliteDb)

  // Run versioned migrations
  runMigrations(sqliteDb)

  return db
}

/**
 * Initialize an in-memory database for testing.
 */
export function initTestDatabase(): BunSQLiteDatabase<typeof schema> {
  const testSqliteDb = new Database(':memory:')
  testSqliteDb.exec('PRAGMA foreign_keys = ON')

  const testDb = drizzle(testSqliteDb, { schema })
  createTables(testSqliteDb)
  runMigrations(testSqliteDb)

  return testDb
}

/**
 * Get the current database instance.
 * Throws if not initialized.
 */
export function getDatabase(): BunSQLiteDatabase<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first')

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
export function getRawDatabase(): Database | null {
  return sqliteDb
}

function createTables(sqliteDb: Database): void {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

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
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      parent_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'none',
      due_date TEXT,
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

// ============================================================
// Versioned Migration System
// ============================================================

interface Migration {
  version: number
  description: string
  up: (db: Database) => void
}

/**
 * Registry of all migrations, ordered by version.
 * Each migration runs exactly once (tracked via schema_version table).
 *
 * To add a new migration:
 * 1. Append a new entry with `version: N+1`
 * 2. Provide the `up` function with the SQL to execute
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Add description, priority, due_date columns to sub_tasks',
    up: (db) => {
      // bun:sqlite uses db.query().all() instead of db.pragma()
      const columns = db
        .query('PRAGMA table_info(sub_tasks)')
        .all() as { name: string }[]
      const colNames = columns.map((col) => col.name)
      if (!colNames.includes('description')) {
        db.exec('ALTER TABLE sub_tasks ADD COLUMN description TEXT')
      }
      if (!colNames.includes('priority')) {
        db.exec("ALTER TABLE sub_tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'")
      }
      if (!colNames.includes('due_date')) {
        db.exec('ALTER TABLE sub_tasks ADD COLUMN due_date TEXT')
      }
    },
  },
  {
    version: 2,
    description: 'Add index on tasks(completed_at) for statistics queries',
    up: (db) => {
      db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)')
    },
  },
  {
    version: 3,
    description: 'Add sort_order column to tasks for drag-and-drop reordering',
    up: (db) => {
      const columns = db
        .query('PRAGMA table_info(tasks)')
        .all() as { name: string }[]
      const colNames = columns.map((col) => col.name)
      if (!colNames.includes('sort_order')) {
        db.exec('ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
        // Initialize sort_order based on created_at (newest first gets lowest order)
        db.exec(`
          UPDATE tasks SET sort_order = (
            SELECT COUNT(*) FROM tasks AS t2 WHERE t2.created_at > tasks.created_at
          )
        `)
      }
      db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)')
    },
  },
  {
    version: 4,
    description: 'Add parent_id column to sub_tasks for recursive nesting',
    up: (db) => {
      const columns = db
        .query('PRAGMA table_info(sub_tasks)')
        .all() as { name: string }[]
      const colNames = columns.map((col) => col.name)
      if (!colNames.includes('parent_id')) {
        db.exec('ALTER TABLE sub_tasks ADD COLUMN parent_id TEXT')
      }
      db.exec('CREATE INDEX IF NOT EXISTS idx_sub_tasks_parent_id ON sub_tasks(parent_id)')
    },
  },
]

function getCurrentVersion(db: Database): number {
  try {
    const row = db
      .query('SELECT MAX(version) as version FROM schema_version')
      .get() as { version: number | null } | null
    return row?.version ?? 0
  } catch {
    // Table might not exist yet for legacy databases
    return 0
  }
}

function runMigrations(sqliteDb: Database): void {
  const currentVersion = getCurrentVersion(sqliteDb)

  const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion)
  if (pendingMigrations.length === 0) return

  // Run all pending migrations in a transaction
  const runAll = sqliteDb.transaction(() => {
    for (const migration of pendingMigrations) {
      migration.up(sqliteDb)
      sqliteDb
        .query('INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)')
        .run(migration.version, new Date().toISOString())
    }
  })

  runAll()
}

export { schema }
export type { BunSQLiteDatabase }
