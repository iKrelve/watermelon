use tauri::State;
use crate::db::Database;
use crate::models::*;
use crate::services::{task, category, tag, search, statistics, data, notification};
use crate::services::notification::NotificationState;

// Commands return Result<T, String> where the String is a JSON-serialized AppError.
// This allows the frontend to parse error details from the rejected promise.

// ============================================================
// Task Commands
// ============================================================

#[tauri::command]
pub fn create_task(db: State<Database>, data: CreateTaskInput) -> Result<Task, String> {
    let conn = db.conn.lock().unwrap();
    task::create_task(&conn, data).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn update_task(db: State<Database>, id: String, data: UpdateTaskInput) -> Result<Task, String> {
    let conn = db.conn.lock().unwrap();
    task::update_task(&conn, &id, data).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn delete_task(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    task::delete_task(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn get_tasks(db: State<Database>, filter: Option<TaskFilter>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    task::get_all_tasks(&conn, filter).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn get_task_by_id(db: State<Database>, id: String) -> Result<Option<Task>, String> {
    let conn = db.conn.lock().unwrap();
    task::get_task_by_id(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn complete_task(
    db: State<Database>,
    notification_state: State<NotificationState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<CompleteTaskResult, String> {
    let conn = db.conn.lock().unwrap();
    notification::cancel(&notification_state, &id);
    let result = task::complete_task(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))?;

    // Schedule notification for next recurring task if applicable
    if let Some(ref next) = result.next_task {
        if let Some(ref reminder) = next.reminder_time {
            notification::schedule(&notification_state, &app, &next.id, &next.title, reminder);
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn uncomplete_task(db: State<Database>, id: String) -> Result<Task, String> {
    let conn = db.conn.lock().unwrap();
    task::uncomplete_task(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn reorder_tasks(db: State<Database>, items: Vec<ReorderTaskItem>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    task::reorder_tasks(&conn, items).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Sub-Task Commands
// ============================================================

#[tauri::command]
pub fn create_sub_task(
    db: State<Database>,
    task_id: String,
    data: CreateSubTaskInput,
    parent_id: Option<String>,
) -> Result<SubTask, String> {
    let conn = db.conn.lock().unwrap();
    task::create_sub_task(&conn, &task_id, data, parent_id)
        .map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn update_sub_task(db: State<Database>, id: String, data: UpdateSubTaskInput) -> Result<SubTask, String> {
    let conn = db.conn.lock().unwrap();
    task::update_sub_task(&conn, &id, data).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn delete_sub_task(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    task::delete_sub_task(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Category Commands
// ============================================================

#[tauri::command]
pub fn create_category(db: State<Database>, data: CreateCategoryInput) -> Result<Category, String> {
    let conn = db.conn.lock().unwrap();
    category::create_category(&conn, data).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn update_category(db: State<Database>, id: String, data: UpdateCategoryInput) -> Result<Category, String> {
    let conn = db.conn.lock().unwrap();
    category::update_category(&conn, &id, data).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn delete_category(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    category::delete_category(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn get_categories(db: State<Database>) -> Result<Vec<Category>, String> {
    let conn = db.conn.lock().unwrap();
    category::get_all_categories(&conn).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Tag Commands
// ============================================================

#[tauri::command]
pub fn create_tag(db: State<Database>, name: String, color: Option<String>) -> Result<Tag, String> {
    let conn = db.conn.lock().unwrap();
    tag::create_tag(&conn, &name, color).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn update_tag(db: State<Database>, id: String, name: String, color: Option<String>) -> Result<Tag, String> {
    let conn = db.conn.lock().unwrap();
    tag::update_tag(&conn, &id, &name, color).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn delete_tag(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    tag::delete_tag(&conn, &id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn get_tags(db: State<Database>) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().unwrap();
    tag::get_all_tags(&conn).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn add_tag_to_task(db: State<Database>, task_id: String, tag_id: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    tag::add_tag_to_task(&conn, &task_id, &tag_id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn remove_tag_from_task(db: State<Database>, task_id: String, tag_id: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    tag::remove_tag_from_task(&conn, &task_id, &tag_id).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Search Commands
// ============================================================

#[tauri::command]
pub fn search_tasks(db: State<Database>, query: Option<String>, filters: Option<TaskFilter>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    search::search_tasks(&conn, query, filters).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Notification Commands
// ============================================================

#[tauri::command]
pub fn schedule_notification(
    notification_state: State<NotificationState>,
    app: tauri::AppHandle,
    task_id: String,
    title: String,
    reminder_time: String,
) -> Result<(), String> {
    notification::schedule(&notification_state, &app, &task_id, &title, &reminder_time);
    Ok(())
}

#[tauri::command]
pub fn cancel_notification(notification_state: State<NotificationState>, task_id: String) -> Result<(), String> {
    notification::cancel(&notification_state, &task_id);
    Ok(())
}

// ============================================================
// Statistics Commands
// ============================================================

#[tauri::command]
pub fn get_stats(db: State<Database>, period: String) -> Result<StatsSummary, String> {
    let conn = db.conn.lock().unwrap();
    statistics::get_stats(&conn, &period).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn get_daily_trend(db: State<Database>, days: i64) -> Result<Vec<DailyTrend>, String> {
    let conn = db.conn.lock().unwrap();
    statistics::get_daily_trend(&conn, days).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Data Management Commands
// ============================================================

#[tauri::command]
pub fn export_data(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    data::export_data(&conn).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

#[tauri::command]
pub fn import_data(db: State<Database>, json_str: String) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    data::import_data(&conn, &json_str).map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}

// ============================================================
// Window Commands
// ============================================================

use std::sync::Mutex;

/// Saved window geometry before entering compact mode, so we can restore it.
pub struct SavedWindowGeometry {
    pub inner: Mutex<Option<WindowGeometry>>,
}

pub struct WindowGeometry {
    pub position: tauri::PhysicalPosition<i32>,
    pub size: tauri::PhysicalSize<u32>,
}

#[tauri::command]
pub fn set_compact_mode(
    app: tauri::AppHandle,
    saved_geometry: State<SavedWindowGeometry>,
    compact: bool,
) -> Result<(), String> {
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    if compact {
        // Save current window position and size before shrinking
        let position = window.outer_position().ok();
        let size = window.outer_size().ok();
        if let (Some(pos), Some(sz)) = (position, size) {
            let mut saved = saved_geometry.inner.lock().unwrap();
            *saved = Some(WindowGeometry {
                position: pos,
                size: sz,
            });
        }

        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(420.0, 600.0)));
        let _ = window.center();
    } else {
        // Restore previous window position and size
        let saved = saved_geometry.inner.lock().unwrap().take();
        if let Some(geo) = saved {
            let _ = window.set_size(tauri::Size::Physical(geo.size));
            let _ = window.set_position(tauri::Position::Physical(geo.position));
        } else {
            // Fallback: default size + center
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(1200.0, 800.0)));
            let _ = window.center();
        }
    }

    Ok(())
}
