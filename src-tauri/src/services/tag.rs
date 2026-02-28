use rusqlite::{Connection, params, OptionalExtension};
use uuid::Uuid;
use crate::models::*;

fn row_to_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        created_at: row.get("created_at")?,
    })
}

pub fn create_tag(conn: &Connection, name: &str, color: Option<String>) -> Result<Tag, AppError> {
    if name.trim().is_empty() {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Tag name must not be empty".into(), details: None });
    }

    let dup: Option<String> = conn
        .query_row("SELECT id FROM tags WHERE name = ?1", params![name.trim()], |row| row.get(0))
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    if dup.is_some() {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Tag name already exists".into(), details: None });
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, name.trim(), color, now],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    Ok(Tag {
        id,
        name: name.trim().to_string(),
        color,
        created_at: now,
    })
}

pub fn update_tag(conn: &Connection, id: &str, name: &str, color: Option<String>) -> Result<Tag, AppError> {
    let exists: bool = conn
        .query_row("SELECT COUNT(*) FROM tags WHERE id = ?1", params![id], |row| row.get::<_, i64>(0))
        .unwrap_or(0) > 0;
    if !exists {
        return Err(AppError { code: "NOT_FOUND".into(), message: "Tag not found".into(), details: None });
    }

    if name.trim().is_empty() {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Tag name must not be empty".into(), details: None });
    }

    let dup: Option<String> = conn
        .query_row("SELECT id FROM tags WHERE name = ?1 AND id != ?2", params![name.trim(), id], |row| row.get(0))
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    if dup.is_some() {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Tag name already exists".into(), details: None });
    }

    conn.execute(
        "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
        params![name.trim(), color, id],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    conn.query_row("SELECT * FROM tags WHERE id = ?1", params![id], row_to_tag)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })
}

pub fn get_all_tags(conn: &Connection) -> Result<Vec<Tag>, AppError> {
    let mut stmt = conn
        .prepare("SELECT * FROM tags ORDER BY name")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let tags: Vec<Tag> = stmt
        .query_map([], row_to_tag)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tags)
}

pub fn delete_tag(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM tags WHERE id = ?1", params![id])
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    Ok(())
}

pub fn add_tag_to_task(conn: &Connection, task_id: &str, tag_id: &str) -> Result<(), AppError> {
    let exists: Option<String> = conn
        .query_row(
            "SELECT task_id FROM task_tags WHERE task_id = ?1 AND tag_id = ?2",
            params![task_id, tag_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    if exists.is_some() {
        return Ok(()); // idempotent
    }

    conn.execute(
        "INSERT INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
        params![task_id, tag_id],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    Ok(())
}

pub fn remove_tag_from_task(conn: &Connection, task_id: &str, tag_id: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM task_tags WHERE task_id = ?1 AND tag_id = ?2",
        params![task_id, tag_id],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    Ok(())
}

/// Find task IDs that have ALL of the specified tags (intersection).
pub fn find_task_ids_by_tags(conn: &Connection, tag_ids: &[String]) -> Result<Vec<String>, AppError> {
    if tag_ids.is_empty() {
        return Ok(vec![]);
    }

    let mut sets: Vec<std::collections::HashSet<String>> = Vec::new();
    for tag_id in tag_ids {
        let mut stmt = conn
            .prepare("SELECT task_id FROM task_tags WHERE tag_id = ?1")
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
        let ids: std::collections::HashSet<String> = stmt
            .query_map(params![tag_id], |row| row.get(0))
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
            .filter_map(|r| r.ok())
            .collect();
        sets.push(ids);
    }

    let mut result = sets[0].clone();
    for s in &sets[1..] {
        result = result.intersection(s).cloned().collect();
    }

    Ok(result.into_iter().collect())
}
