use rusqlite::{Connection, params, OptionalExtension};
use uuid::Uuid;
use crate::models::*;

fn row_to_category(row: &rusqlite::Row) -> rusqlite::Result<Category> {
    Ok(Category {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
    })
}

pub fn create_category(conn: &Connection, input: CreateCategoryInput) -> Result<Category, AppError> {
    if input.name.trim().is_empty() {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Category name must not be empty".into(), details: None });
    }

    // Check duplicate
    let dup: Option<String> = conn
        .query_row("SELECT id FROM categories WHERE name = ?1", params![input.name.trim()], |row| row.get(0))
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    if dup.is_some() {
        return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Category name already exists".into(), details: None });
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let max_order: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) FROM categories", [], |row| row.get(0))
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, input.name.trim(), input.color, max_order + 1, now],
    )
    .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    Ok(Category {
        id,
        name: input.name.trim().to_string(),
        color: input.color,
        sort_order: max_order + 1,
        created_at: now,
    })
}

pub fn get_all_categories(conn: &Connection) -> Result<Vec<Category>, AppError> {
    let mut stmt = conn
        .prepare("SELECT * FROM categories ORDER BY sort_order")
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    let cats: Vec<Category> = stmt
        .query_map([], row_to_category)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(cats)
}

pub fn update_category(conn: &Connection, id: &str, input: UpdateCategoryInput) -> Result<Category, AppError> {
    let existing = conn
        .query_row("SELECT * FROM categories WHERE id = ?1", params![id], row_to_category)
        .optional()
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .ok_or_else(|| AppError { code: "NOT_FOUND".into(), message: "Category not found".into(), details: None })?;

    if let Some(ref name) = input.name {
        if name.trim().is_empty() {
            return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Category name must not be empty".into(), details: None });
        }
        // Check duplicate (excluding current)
        let dup: Option<String> = conn
            .query_row("SELECT id FROM categories WHERE name = ?1 AND id != ?2", params![name.trim(), id], |row| row.get(0))
            .optional()
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
        if dup.is_some() {
            return Err(AppError { code: "VALIDATION_ERROR".into(), message: "Category name already exists".into(), details: None });
        }
    }

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref name) = input.name {
        sets.push("name = ?".to_string());
        values.push(Box::new(name.trim().to_string()));
    }
    if let Some(ref color) = input.color {
        sets.push("color = ?".to_string());
        values.push(Box::new(color.clone()));
    }
    if let Some(order) = input.sort_order {
        sets.push("sort_order = ?".to_string());
        values.push(Box::new(order));
    }

    if !sets.is_empty() {
        values.push(Box::new(id.to_string()));
        let sql = format!("UPDATE categories SET {} WHERE id = ?", sets.join(", "));
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())
            .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    }

    conn.query_row("SELECT * FROM categories WHERE id = ?1", params![id], row_to_category)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })
}

pub fn delete_category(conn: &Connection, id: &str) -> Result<(), AppError> {
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    Ok(())
}
