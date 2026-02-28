use rusqlite::{Connection, params};
use crate::models::*;

pub fn export_data(conn: &Connection) -> Result<String, AppError> {
    let all_tasks = query_all_tasks_raw(conn)?;
    let all_sub_tasks = query_all_sub_tasks_raw(conn)?;
    let all_categories = query_all_categories_raw(conn)?;
    let all_tags = query_all_tags_raw(conn)?;
    let all_task_tags = query_all_task_tags(conn)?;
    let all_notes = query_all_notes_raw(conn)?;

    let data = ExportData {
        version: 1,
        exported_at: chrono::Utc::now().to_rfc3339(),
        tasks: all_tasks,
        sub_tasks: all_sub_tasks,
        categories: all_categories,
        tags: all_tags,
        task_tags: all_task_tags,
        notes: all_notes,
    };

    serde_json::to_string_pretty(&data)
        .map_err(|e| AppError { code: "SERIALIZE_ERROR".into(), message: e.to_string(), details: None })
}

pub fn import_data(conn: &Connection, json_str: &str) -> Result<(), AppError> {
    let data: ExportData = serde_json::from_str(json_str)
        .map_err(|_| AppError { code: "VALIDATION_ERROR".into(), message: "Invalid JSON format".into(), details: None })?;

    if data.version != 1 {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Unsupported export version".into(), details: None });
    }

    // Import categories first
    for cat in &data.categories {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO categories (id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![cat.id, cat.name, cat.color, cat.sort_order, cat.created_at],
        );
    }

    // Import tags
    for tag in &data.tags {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![tag.id, tag.name, tag.color, tag.created_at],
        );
    }

    // Import tasks
    for task in &data.tasks {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO tasks (id, title, description, status, priority, category_id, due_date, reminder_time, recurrence_rule, completed_at, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                task.id, task.title, task.description, task.status, task.priority,
                task.category_id, task.due_date, task.reminder_time, task.recurrence_rule,
                task.completed_at, task.sort_order, task.created_at, task.updated_at,
            ],
        );
    }

    // Import sub-tasks
    for st in &data.sub_tasks {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO sub_tasks (id, task_id, parent_id, title, description, priority, due_date, completed, sort_order, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                st.id, st.task_id, st.parent_id, st.title, st.description,
                st.priority, st.due_date, st.completed as i64, st.sort_order, st.created_at,
            ],
        );
    }

    // Import task-tag associations
    for tt in &data.task_tags {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
            params![tt.task_id, tt.tag_id],
        );
    }

    // Import notes
    for note in &data.notes {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO notes (id, title, content, is_pinned, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                note.id, note.title, note.content, note.is_pinned as i64,
                note.sort_order, note.created_at, note.updated_at,
            ],
        );
    }

    Ok(())
}

// ============================================================
// Raw query helpers for export
// ============================================================

fn query_all_tasks_raw(conn: &Connection) -> Result<Vec<ExportTaskRow>, AppError> {
    let mut stmt = conn.prepare("SELECT * FROM tasks")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let rows: Vec<ExportTaskRow> = stmt
        .query_map([], |row| {
            Ok(ExportTaskRow {
                id: row.get("id")?,
                title: row.get("title")?,
                description: row.get("description")?,
                status: row.get("status")?,
                priority: row.get("priority")?,
                category_id: row.get("category_id")?,
                due_date: row.get("due_date")?,
                reminder_time: row.get("reminder_time")?,
                recurrence_rule: row.get("recurrence_rule")?,
                completed_at: row.get("completed_at")?,
                sort_order: row.get("sort_order")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

fn query_all_sub_tasks_raw(conn: &Connection) -> Result<Vec<ExportSubTaskRow>, AppError> {
    let mut stmt = conn.prepare("SELECT * FROM sub_tasks")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let rows: Vec<ExportSubTaskRow> = stmt
        .query_map([], |row| {
            let completed_int: i64 = row.get("completed")?;
            Ok(ExportSubTaskRow {
                id: row.get("id")?,
                task_id: row.get("task_id")?,
                parent_id: row.get("parent_id")?,
                title: row.get("title")?,
                description: row.get("description")?,
                priority: row.get::<_, Option<String>>("priority")?.unwrap_or_else(|| "none".to_string()),
                due_date: row.get("due_date")?,
                completed: completed_int != 0,
                sort_order: row.get("sort_order")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

fn query_all_categories_raw(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut stmt = conn.prepare("SELECT * FROM categories")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let rows: Vec<Category> = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get("id")?,
                name: row.get("name")?,
                color: row.get("color")?,
                sort_order: row.get("sort_order")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

fn query_all_tags_raw(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn.prepare("SELECT * FROM tags")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let rows: Vec<Tag> = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get("id")?,
                name: row.get("name")?,
                color: row.get("color")?,
                created_at: row.get("created_at")?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

fn query_all_notes_raw(conn: &Connection) -> Result<Vec<Note>, AppError> {
    let mut stmt = conn.prepare("SELECT * FROM notes")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let rows: Vec<Note> = stmt
        .query_map([], |row| {
            let is_pinned_int: i64 = row.get("is_pinned")?;
            Ok(Note {
                id: row.get("id")?,
                title: row.get("title")?,
                content: row.get("content")?,
                is_pinned: is_pinned_int != 0,
                sort_order: row.get("sort_order")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

fn query_all_task_tags(conn: &Connection) -> Result<Vec<TaskTagRow>, AppError> {
    let mut stmt = conn.prepare("SELECT task_id, tag_id FROM task_tags")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let rows: Vec<TaskTagRow> = stmt
        .query_map([], |row| {
            Ok(TaskTagRow {
                task_id: row.get(0)?,
                tag_id: row.get(1)?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}
