use rusqlite::{Connection, params};
use std::path::Path;
use std::sync::Mutex;

/// Global database state managed by Tauri
pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) a SQLite database at the given path.
    pub fn new(path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode = WAL")?;
        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON")?;

        create_tables(&conn)?;
        run_migrations(&conn)?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
}

// ============================================================
// Table Creation
// ============================================================

fn create_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "
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
        ",
    )?;
    Ok(())
}

// ============================================================
// Versioned Migration System
// ============================================================

fn get_current_version(conn: &Connection) -> i64 {
    conn.query_row(
        "SELECT MAX(version) FROM schema_version",
        [],
        |row| row.get::<_, Option<i64>>(0),
    )
    .unwrap_or(Some(0))
    .unwrap_or(0)
}

fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let current_version = get_current_version(conn);

    let migrations: Vec<(i64, &str, Box<dyn Fn(&Connection) -> Result<(), rusqlite::Error>>)> = vec![
        (1, "Add description, priority, due_date columns to sub_tasks", Box::new(|conn| {
            let cols = get_column_names(conn, "sub_tasks")?;
            if !cols.contains(&"description".to_string()) {
                conn.execute_batch("ALTER TABLE sub_tasks ADD COLUMN description TEXT")?;
            }
            if !cols.contains(&"priority".to_string()) {
                conn.execute_batch("ALTER TABLE sub_tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'none'")?;
            }
            if !cols.contains(&"due_date".to_string()) {
                conn.execute_batch("ALTER TABLE sub_tasks ADD COLUMN due_date TEXT")?;
            }
            Ok(())
        })),
        (2, "Add index on tasks(completed_at)", Box::new(|conn| {
            conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)")?;
            Ok(())
        })),
        (3, "Add sort_order column to tasks", Box::new(|conn| {
            let cols = get_column_names(conn, "tasks")?;
            if !cols.contains(&"sort_order".to_string()) {
                conn.execute_batch("ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0")?;
                conn.execute_batch(
                    "UPDATE tasks SET sort_order = (
                        SELECT COUNT(*) FROM tasks AS t2 WHERE t2.created_at > tasks.created_at
                    )"
                )?;
            }
            conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order)")?;
            Ok(())
        })),
        (4, "Add parent_id column to sub_tasks", Box::new(|conn| {
            let cols = get_column_names(conn, "sub_tasks")?;
            if !cols.contains(&"parent_id".to_string()) {
                conn.execute_batch("ALTER TABLE sub_tasks ADD COLUMN parent_id TEXT")?;
            }
            conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_sub_tasks_parent_id ON sub_tasks(parent_id)")?;
            Ok(())
        })),
        (5, "Create notes table", Box::new(|conn| {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '',
                    content TEXT NOT NULL DEFAULT '',
                    is_pinned INTEGER NOT NULL DEFAULT 0,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
                CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);"
            )?;
            Ok(())
        })),
    ];

    let pending: Vec<_> = migrations.into_iter().filter(|(v, _, _)| *v > current_version).collect();
    if pending.is_empty() {
        return Ok(());
    }

    let tx = conn;
    for (version, _desc, up) in &pending {
        up(tx)?;
        tx.execute(
            "INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?1, ?2)",
            params![version, chrono::Utc::now().to_rfc3339()],
        )?;
    }

    Ok(())
}

fn get_column_names(conn: &Connection, table: &str) -> Result<Vec<String>, rusqlite::Error> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let names = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(names)
}
