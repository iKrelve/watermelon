use rusqlite::{Connection, params, OptionalExtension};
use uuid::Uuid;
use crate::models::*;
use crate::utils::recurrence::get_next_occurrence;
use chrono::NaiveDate;

// ============================================================
// Row → Model mappers
// ============================================================

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    let recurrence_str: Option<String> = row.get("recurrence_rule")?;
    let recurrence_rule = recurrence_str
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());

    Ok(Task {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        status: row.get("status")?,
        priority: row.get("priority")?,
        category_id: row.get("category_id")?,
        due_date: row.get("due_date")?,
        reminder_time: row.get("reminder_time")?,
        recurrence_rule,
        completed_at: row.get("completed_at")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        sub_tasks: None,
        tags: None,
        category: None,
    })
}

fn row_to_sub_task(row: &rusqlite::Row) -> rusqlite::Result<SubTask> {
    let completed_int: i64 = row.get("completed")?;
    Ok(SubTask {
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
        children: None,
    })
}

/// Build a tree of sub-tasks from a flat list.
pub fn build_sub_task_tree(flat: Vec<SubTask>) -> Vec<SubTask> {
    use std::collections::HashMap;

    let mut by_id: HashMap<String, SubTask> = HashMap::new();
    for st in flat {
        by_id.insert(st.id.clone(), SubTask { children: Some(vec![]), ..st });
    }

    let mut roots: Vec<SubTask> = Vec::new();
    let ids: Vec<String> = by_id.keys().cloned().collect();

    for id in &ids {
        let parent_id = by_id.get(id).and_then(|st| st.parent_id.clone());
        if let Some(ref pid) = parent_id {
            if by_id.contains_key(pid) {
                let child = by_id.remove(id).unwrap();
                by_id.get_mut(pid).unwrap().children.as_mut().unwrap().push(child);
            }
        }
    }

    for (_id, st) in by_id {
        roots.push(st);
    }
    roots.sort_by_key(|s| s.sort_order);
    roots
}

// ============================================================
// Task Service
// ============================================================

pub fn create_task(conn: &Connection, input: CreateTaskInput) -> Result<Task, AppError> {
    validate_title(&input.title)?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Assign sort_order: new task gets min(sortOrder) - 1
    let min_order: i64 = conn
        .query_row("SELECT COALESCE(MIN(sort_order), 0) FROM tasks", [], |row| row.get(0))
        .unwrap_or(0);
    let new_sort_order = min_order - 1;

    let recurrence_json = input
        .recurrence_rule
        .as_ref()
        .map(|r| serde_json::to_string(r).unwrap_or_default());

    conn.execute(
        "INSERT INTO tasks (id, title, description, status, priority, category_id, due_date, reminder_time, recurrence_rule, completed_at, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'todo', ?4, ?5, ?6, ?7, ?8, NULL, ?9, ?10, ?11)",
        params![
            id,
            input.title.trim(),
            input.description,
            input.priority.as_deref().unwrap_or("none"),
            input.category_id,
            input.due_date,
            input.reminder_time,
            recurrence_json,
            new_sort_order,
            now,
            now,
        ],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    get_task_by_id(conn, &id)
        .and_then(|t| t.ok_or_else(|| AppError { code: "DB_ERROR".into(), message: "Failed to read created task".into(), details: None }))
}

pub fn get_task_by_id(conn: &Connection, id: &str) -> Result<Option<Task>, AppError> {
    let task = conn
        .query_row("SELECT * FROM tasks WHERE id = ?1", params![id], row_to_task)
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    let Some(mut task) = task else { return Ok(None) };

    // Load sub-tasks
    let mut stmt = conn
        .prepare("SELECT * FROM sub_tasks WHERE task_id = ?1 ORDER BY sort_order")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let sub_tasks: Vec<SubTask> = stmt
        .query_map(params![id], row_to_sub_task)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    task.sub_tasks = Some(build_sub_task_tree(sub_tasks));

    // Load tags
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color, t.created_at
             FROM task_tags tt INNER JOIN tags t ON tt.tag_id = t.id
             WHERE tt.task_id = ?1",
        )
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let tag_list: Vec<Tag> = stmt
        .query_map(params![id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    task.tags = Some(tag_list);

    Ok(Some(task))
}

pub fn get_all_tasks(conn: &Connection, filter: Option<TaskFilter>) -> Result<Vec<Task>, AppError> {
    let status_filter = filter.as_ref().and_then(|f| f.status.clone());

    let rows: Vec<Task> = if let Some(ref status) = status_filter {
        let mut stmt = conn
            .prepare("SELECT * FROM tasks WHERE status = ?1 ORDER BY sort_order")
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
        stmt.query_map(params![status], row_to_task)
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
            .filter_map(|r| r.ok())
            .collect()
    } else {
        let mut stmt = conn
            .prepare("SELECT * FROM tasks ORDER BY sort_order")
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
        stmt.query_map([], row_to_task)
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
            .filter_map(|r| r.ok())
            .collect()
    };

    if rows.is_empty() {
        return Ok(rows);
    }

    let task_ids: Vec<String> = rows.iter().map(|t| t.id.clone()).collect();
    let placeholders = task_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    // Batch-load sub-tasks
    let sql = format!("SELECT * FROM sub_tasks WHERE task_id IN ({}) ORDER BY sort_order", placeholders);
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = task_ids.iter().map(|s| s as &dyn rusqlite::types::ToSql).collect();
    let all_sub_tasks: Vec<SubTask> = stmt
        .query_map(params_refs.as_slice(), row_to_sub_task)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();

    let mut sub_tasks_by_task: std::collections::HashMap<String, Vec<SubTask>> = std::collections::HashMap::new();
    for st in all_sub_tasks {
        sub_tasks_by_task.entry(st.task_id.clone()).or_default().push(st);
    }

    // Batch-load tags
    let sql = format!(
        "SELECT tt.task_id, t.id, t.name, t.color, t.created_at
         FROM task_tags tt INNER JOIN tags t ON tt.tag_id = t.id
         WHERE tt.task_id IN ({})",
        placeholders
    );
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    struct TaskTag {
        task_id: String,
        tag: Tag,
    }

    let all_task_tags: Vec<TaskTag> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(TaskTag {
                task_id: row.get(0)?,
                tag: Tag {
                    id: row.get(1)?,
                    name: row.get(2)?,
                    color: row.get(3)?,
                    created_at: row.get(4)?,
                },
            })
        })
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();

    let mut tags_by_task: std::collections::HashMap<String, Vec<Tag>> = std::collections::HashMap::new();
    for tt in all_task_tags {
        tags_by_task.entry(tt.task_id).or_default().push(tt.tag);
    }

    // Attach relations
    let mut result = rows;
    for task in &mut result {
        let subs = sub_tasks_by_task.remove(&task.id).unwrap_or_default();
        task.sub_tasks = Some(build_sub_task_tree(subs));
        task.tags = Some(tags_by_task.remove(&task.id).unwrap_or_default());
    }

    Ok(result)
}

pub fn update_task(conn: &Connection, id: &str, input: UpdateTaskInput) -> Result<Task, AppError> {
    if let Some(ref title) = input.title {
        validate_title(title)?;
    }

    // Check exists
    let exists: bool = conn
        .query_row("SELECT COUNT(*) FROM tasks WHERE id = ?1", params![id], |row| row.get::<_, i64>(0))
        .unwrap_or(0)
        > 0;
    if !exists {
        return Err(AppError { code: "NOT_FOUND".into(), message: "Task not found".into(), details: None });
    }

    let now = chrono::Utc::now().to_rfc3339();
    let mut sets: Vec<String> = vec!["updated_at = ?".to_string()];
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    if let Some(ref title) = input.title {
        sets.push("title = ?".to_string());
        values.push(Box::new(title.trim().to_string()));
    }
    if let Some(ref desc) = input.description {
        sets.push("description = ?".to_string());
        values.push(Box::new(desc.clone()));
    }
    if let Some(ref priority) = input.priority {
        sets.push("priority = ?".to_string());
        values.push(Box::new(priority.clone()));
    }
    if let Some(ref cat_id) = input.category_id {
        sets.push("category_id = ?".to_string());
        values.push(Box::new(cat_id.clone()));
    }
    if let Some(ref due) = input.due_date {
        sets.push("due_date = ?".to_string());
        values.push(Box::new(due.clone()));
    }
    if let Some(ref rem) = input.reminder_time {
        sets.push("reminder_time = ?".to_string());
        values.push(Box::new(rem.clone()));
    }
    if let Some(ref rec) = input.recurrence_rule {
        sets.push("recurrence_rule = ?".to_string());
        let json = rec.as_ref().map(|r| serde_json::to_string(r).unwrap_or_default());
        values.push(Box::new(json));
    }

    values.push(Box::new(id.to_string()));

    let sql = format!("UPDATE tasks SET {} WHERE id = ?", sets.join(", "));
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    get_task_by_id(conn, id)?
        .ok_or_else(|| AppError { code: "NOT_FOUND".into(), message: "Task not found".into(), details: None })
}

pub fn delete_task(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    Ok(())
}

pub fn complete_task(conn: &Connection, id: &str) -> Result<CompleteTaskResult, AppError> {
    // Read existing task (raw data for recurrence)
    let existing = conn
        .query_row("SELECT * FROM tasks WHERE id = ?1", params![id], row_to_task)
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .ok_or_else(|| AppError { code: "NOT_FOUND".into(), message: "Task not found".into(), details: None })?;

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET status = 'completed', completed_at = ?1, updated_at = ?2 WHERE id = ?3",
        params![now, now, id],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    let completed_task = get_task_by_id(conn, id)?
        .ok_or_else(|| AppError { code: "NOT_FOUND".into(), message: "Task not found".into(), details: None })?;

    // If recurring, create next instance
    let mut next_task = None;
    if let Some(ref rule) = existing.recurrence_rule {
        let current_date_str = existing.due_date.as_deref().unwrap_or("");
        let current_date = NaiveDate::parse_from_str(current_date_str, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Utc::now().date_naive());
        let next_date = get_next_occurrence(rule, current_date);

        // Check end date
        if let Some(ref end_str) = rule.end_date {
            if let Ok(end_date) = NaiveDate::parse_from_str(end_str, "%Y-%m-%d") {
                if next_date > end_date {
                    return Ok(CompleteTaskResult { completed_task, next_task: None });
                }
            }
        }

        let new_task = create_task(conn, CreateTaskInput {
            title: existing.title.clone(),
            description: existing.description.clone(),
            priority: Some(existing.priority.clone()),
            category_id: existing.category_id.clone(),
            due_date: Some(next_date.format("%Y-%m-%d").to_string()),
            reminder_time: existing.reminder_time.clone(),
            recurrence_rule: Some(rule.clone()),
        })?;
        next_task = Some(new_task);
    }

    Ok(CompleteTaskResult { completed_task, next_task })
}

pub fn uncomplete_task(conn: &Connection, id: &str) -> Result<Task, AppError> {
    let exists: bool = conn
        .query_row("SELECT COUNT(*) FROM tasks WHERE id = ?1", params![id], |row| row.get::<_, i64>(0))
        .unwrap_or(0) > 0;
    if !exists {
        return Err(AppError { code: "NOT_FOUND".into(), message: "Task not found".into(), details: None });
    }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE tasks SET status = 'todo', completed_at = NULL, updated_at = ?1 WHERE id = ?2",
        params![now, id],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    get_task_by_id(conn, id)?
        .ok_or_else(|| AppError { code: "NOT_FOUND".into(), message: "Task not found".into(), details: None })
}

pub fn reorder_tasks(conn: &Connection, items: Vec<ReorderTaskItem>) -> Result<(), AppError> {
    if items.is_empty() {
        return Ok(());
    }
    let now = chrono::Utc::now().to_rfc3339();
    for item in &items {
        conn.execute(
            "UPDATE tasks SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
            params![item.sort_order, now, item.id],
        )
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    }
    Ok(())
}

// ============================================================
// Sub-task CRUD
// ============================================================

pub fn create_sub_task(conn: &Connection, task_id: &str, input: CreateSubTaskInput, parent_id_override: Option<String>) -> Result<SubTask, AppError> {
    validate_title(&input.title)?;

    // Verify parent task exists
    let exists: bool = conn
        .query_row("SELECT COUNT(*) FROM tasks WHERE id = ?1", params![task_id], |row| row.get::<_, i64>(0))
        .unwrap_or(0) > 0;
    if !exists {
        return Err(AppError { code: "NOT_FOUND".into(), message: "Parent task not found".into(), details: None });
    }

    let parent_id = parent_id_override.or(input.parent_id.clone());

    // Verify parent sub-task if nesting
    if let Some(ref pid) = parent_id {
        let parent_check: Option<String> = conn
            .query_row("SELECT task_id FROM sub_tasks WHERE id = ?1", params![pid], |row| row.get(0))
            .optional()
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
        match parent_check {
            None => return Err(AppError { code: "NOT_FOUND".into(), message: "Parent sub-task not found".into(), details: None }),
            Some(ref ptid) if ptid != task_id => {
                return Err(AppError {
                    code: "VALIDATION_ERROR".into(),
                    message: "Parent sub-task does not belong to this task".into(),
                    details: None,
                });
            }
            _ => {}
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Get max sort order among siblings
    let max_order: i64 = if let Some(ref pid) = parent_id {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM sub_tasks WHERE task_id = ?1 AND parent_id = ?2",
            params![task_id, pid],
            |row| row.get(0),
        ).unwrap_or(-1)
    } else {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM sub_tasks WHERE task_id = ?1 AND parent_id IS NULL",
            params![task_id],
            |row| row.get(0),
        ).unwrap_or(-1)
    };

    let sort_order = input.sort_order.unwrap_or(max_order + 1);

    conn.execute(
        "INSERT INTO sub_tasks (id, task_id, parent_id, title, description, priority, due_date, completed, sort_order, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9)",
        params![
            id,
            task_id,
            parent_id,
            input.title.trim(),
            input.description,
            input.priority.as_deref().unwrap_or("none"),
            input.due_date,
            sort_order,
            now,
        ],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    Ok(SubTask {
        id,
        task_id: task_id.to_string(),
        parent_id,
        title: input.title.trim().to_string(),
        description: input.description,
        priority: input.priority.unwrap_or_else(|| "none".to_string()),
        due_date: input.due_date,
        completed: false,
        sort_order,
        created_at: now,
        children: None,
    })
}

pub fn update_sub_task(conn: &Connection, id: &str, input: UpdateSubTaskInput) -> Result<SubTask, AppError> {
    if let Some(ref title) = input.title {
        validate_title(title)?;
    }

    let exists: bool = conn
        .query_row("SELECT COUNT(*) FROM sub_tasks WHERE id = ?1", params![id], |row| row.get::<_, i64>(0))
        .unwrap_or(0) > 0;
    if !exists {
        return Err(AppError { code: "NOT_FOUND".into(), message: "Sub-task not found".into(), details: None });
    }

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref title) = input.title {
        sets.push("title = ?".to_string());
        values.push(Box::new(title.trim().to_string()));
    }
    if let Some(ref desc) = input.description {
        sets.push("description = ?".to_string());
        values.push(Box::new(desc.clone()));
    }
    if let Some(ref priority) = input.priority {
        sets.push("priority = ?".to_string());
        values.push(Box::new(priority.clone()));
    }
    if let Some(ref due) = input.due_date {
        sets.push("due_date = ?".to_string());
        values.push(Box::new(due.clone()));
    }
    if let Some(completed) = input.completed {
        sets.push("completed = ?".to_string());
        values.push(Box::new(completed as i64));
    }
    if let Some(order) = input.sort_order {
        sets.push("sort_order = ?".to_string());
        values.push(Box::new(order));
    }

    if !sets.is_empty() {
        values.push(Box::new(id.to_string()));
        let sql = format!("UPDATE sub_tasks SET {} WHERE id = ?", sets.join(", "));
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    }

    conn.query_row("SELECT * FROM sub_tasks WHERE id = ?1", params![id], row_to_sub_task)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })
}

pub fn delete_sub_task(conn: &Connection, id: &str) -> Result<(), AppError> {
    delete_sub_task_descendants(conn, id)?;
    conn.execute("DELETE FROM sub_tasks WHERE id = ?1", params![id])
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    Ok(())
}

fn delete_sub_task_descendants(conn: &Connection, parent_id: &str) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare("SELECT id FROM sub_tasks WHERE parent_id = ?1")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let children: Vec<String> = stmt
        .query_map(params![parent_id], |row| row.get(0))
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();

    for child_id in &children {
        delete_sub_task_descendants(conn, child_id)?;
        conn.execute("DELETE FROM sub_tasks WHERE id = ?1", params![child_id])
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    }
    Ok(())
}

// ============================================================
// Helpers
// ============================================================

fn validate_title(title: &str) -> Result<(), AppError> {
    if title.trim().is_empty() {
        return Err(AppError {
            code: "VALIDATION_ERROR".into(),
            message: "Title must not be empty or whitespace-only".into(),
            details: None,
        });
    }
    Ok(())
}
