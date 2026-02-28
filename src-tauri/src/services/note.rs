use rusqlite::{Connection, params, OptionalExtension};
use uuid::Uuid;
use crate::models::*;

// ============================================================
// Row → Model mapper
// ============================================================

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
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
}

fn make_error(code: &str, message: &str) -> AppError {
    AppError {
        code: code.to_string(),
        message: message.to_string(),
        details: None,
    }
}

// ============================================================
// CRUD
// ============================================================

pub fn create_note(conn: &Connection, input: CreateNoteInput) -> Result<Note, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let title = input.title.unwrap_or_default();
    let content = input.content.unwrap_or_default();

    conn.execute(
        "INSERT INTO notes (id, title, content, is_pinned, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, 0, 0, ?4, ?5)",
        params![id, title, content, now, now],
    )
    .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    get_note_by_id(conn, &id)?
        .ok_or_else(|| make_error("NOT_FOUND", "Note not found after creation"))
}

pub fn update_note(conn: &Connection, id: &str, input: UpdateNoteInput) -> Result<Note, AppError> {
    let existing = get_note_by_id(conn, id)?
        .ok_or_else(|| make_error("NOT_FOUND", &format!("Note {} not found", id)))?;

    let title = input.title.unwrap_or(existing.title);
    let content = input.content.unwrap_or(existing.content);
    let is_pinned = input.is_pinned.unwrap_or(existing.is_pinned);
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2, is_pinned = ?3, updated_at = ?4 WHERE id = ?5",
        params![title, content, is_pinned as i64, now, id],
    )
    .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    get_note_by_id(conn, id)?
        .ok_or_else(|| make_error("NOT_FOUND", "Note not found after update"))
}

pub fn delete_note(conn: &Connection, id: &str) -> Result<(), AppError> {
    let changes = conn
        .execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    if changes == 0 {
        return Err(make_error("NOT_FOUND", &format!("Note {} not found", id)));
    }
    Ok(())
}

pub fn get_all_notes(conn: &Connection) -> Result<Vec<Note>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC",
        )
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    let notes = stmt
        .query_map([], |row| row_to_note(row))
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(notes)
}

pub fn get_note_by_id(conn: &Connection, id: &str) -> Result<Option<Note>, AppError> {
    let mut stmt = conn
        .prepare("SELECT * FROM notes WHERE id = ?1")
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    let note = stmt
        .query_row(params![id], |row| row_to_note(row))
        .optional()
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    Ok(note)
}

pub fn search_notes(conn: &Connection, query: Option<String>) -> Result<Vec<Note>, AppError> {
    let query_str = match query {
        Some(ref q) if !q.trim().is_empty() => q.trim().to_string(),
        _ => return get_all_notes(conn),
    };

    let pattern = format!("%{}%", query_str);
    let mut stmt = conn
        .prepare(
            "SELECT * FROM notes
             WHERE title LIKE ?1 OR content LIKE ?1
             ORDER BY is_pinned DESC, updated_at DESC",
        )
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?;

    let notes = stmt
        .query_map(params![pattern], |row| row_to_note(row))
        .map_err(|e| make_error("DB_ERROR", &e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(notes)
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                is_pinned INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );"
        ).unwrap();
        conn
    }

    #[test]
    fn test_create_and_get_note() {
        let conn = setup_db();
        let note = create_note(&conn, CreateNoteInput {
            title: Some("Test Note".to_string()),
            content: Some("<p>Hello</p>".to_string()),
        }).unwrap();

        assert_eq!(note.title, "Test Note");
        assert_eq!(note.content, "<p>Hello</p>");
        assert!(!note.is_pinned);

        let fetched = get_note_by_id(&conn, &note.id).unwrap().unwrap();
        assert_eq!(fetched.id, note.id);
    }

    #[test]
    fn test_update_note() {
        let conn = setup_db();
        let note = create_note(&conn, CreateNoteInput {
            title: Some("Original".to_string()),
            content: None,
        }).unwrap();

        let updated = update_note(&conn, &note.id, UpdateNoteInput {
            title: Some("Updated".to_string()),
            content: None,
            is_pinned: Some(true),
        }).unwrap();

        assert_eq!(updated.title, "Updated");
        assert!(updated.is_pinned);
    }

    #[test]
    fn test_delete_note() {
        let conn = setup_db();
        let note = create_note(&conn, CreateNoteInput {
            title: Some("To Delete".to_string()),
            content: None,
        }).unwrap();

        delete_note(&conn, &note.id).unwrap();
        assert!(get_note_by_id(&conn, &note.id).unwrap().is_none());
    }

    #[test]
    fn test_search_notes() {
        let conn = setup_db();
        create_note(&conn, CreateNoteInput {
            title: Some("Meeting Notes".to_string()),
            content: Some("<p>Discuss roadmap</p>".to_string()),
        }).unwrap();
        create_note(&conn, CreateNoteInput {
            title: Some("Shopping List".to_string()),
            content: Some("<p>Buy milk</p>".to_string()),
        }).unwrap();

        let results = search_notes(&conn, Some("meeting".to_string())).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Meeting Notes");

        let results = search_notes(&conn, Some("roadmap".to_string())).unwrap();
        assert_eq!(results.len(), 1);
    }
}
