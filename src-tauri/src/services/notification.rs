use rusqlite::{Connection, params};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

/// Notification service state — scheduled timers live in-process.
/// Uses Tauri's notification plugin for actual delivery.
pub struct NotificationState {
    /// Map of taskId → join handle for the scheduled timer thread
    pub scheduled: Mutex<HashMap<String, std::thread::JoinHandle<()>>>,
    /// Cancellation flags: taskId → should_cancel
    pub cancel_flags: Mutex<HashMap<String, std::sync::Arc<std::sync::atomic::AtomicBool>>>,
}

impl NotificationState {
    pub fn new() -> Self {
        Self {
            scheduled: Mutex::new(HashMap::new()),
            cancel_flags: Mutex::new(HashMap::new()),
        }
    }
}

/// Schedule a notification at a future time.
pub fn schedule(state: &NotificationState, app: &tauri::AppHandle, task_id: &str, title: &str, reminder_time_str: &str) {
    // Cancel existing
    cancel(state, task_id);

    let now = chrono::Utc::now();
    let reminder = match chrono::DateTime::parse_from_rfc3339(reminder_time_str) {
        Ok(dt) => dt.with_timezone(&chrono::Utc),
        Err(_) => return,
    };

    if reminder <= now {
        // Deliver immediately
        deliver_notification(app, title);
        return;
    }

    let delay = (reminder - now).to_std().unwrap_or(Duration::ZERO);
    let cancel_flag = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let flag_clone = cancel_flag.clone();
    let title_owned = title.to_string();
    let _task_id_owned = task_id.to_string();
    let app_handle = app.clone();

    let handle = std::thread::spawn(move || {
        std::thread::sleep(delay);
        if !flag_clone.load(std::sync::atomic::Ordering::Relaxed) {
            deliver_notification(&app_handle, &title_owned);
        }
    });

    state.scheduled.lock().unwrap().insert(task_id.to_string(), handle);
    state.cancel_flags.lock().unwrap().insert(task_id.to_string(), cancel_flag);
}

/// Cancel a scheduled notification.
pub fn cancel(state: &NotificationState, task_id: &str) {
    if let Some(flag) = state.cancel_flags.lock().unwrap().remove(task_id) {
        flag.store(true, std::sync::atomic::Ordering::Relaxed);
    }
    state.scheduled.lock().unwrap().remove(task_id);
}

/// Check for missed reminders on app startup.
pub fn check_missed_reminders(conn: &Connection, app: &tauri::AppHandle) {
    let now = chrono::Utc::now().to_rfc3339();

    let mut stmt = match conn.prepare(
        "SELECT id, title FROM tasks WHERE status = 'todo' AND reminder_time IS NOT NULL AND reminder_time <= ?1"
    ) {
        Ok(s) => s,
        Err(_) => return,
    };

    let missed: Vec<(String, String)> = match stmt.query_map(params![now], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => vec![],
    };

    for (id, title) in &missed {
        deliver_notification(app, title);
        let _ = conn.execute("UPDATE tasks SET reminder_time = NULL WHERE id = ?1", params![id]);
    }
}

/// Schedule all future reminders on app startup.
pub fn schedule_all_future_reminders(conn: &Connection, state: &NotificationState, app: &tauri::AppHandle) {
    let now = chrono::Utc::now().to_rfc3339();

    let mut stmt = match conn.prepare(
        "SELECT id, title, reminder_time FROM tasks WHERE status = 'todo' AND reminder_time IS NOT NULL"
    ) {
        Ok(s) => s,
        Err(_) => return,
    };

    let future_tasks: Vec<(String, String, String)> = match stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
        ))
    }) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(_) => vec![],
    };

    for (id, title, reminder_time) in &future_tasks {
        if reminder_time.as_str() > now.as_str() {
            schedule(state, app, id, title, reminder_time);
        }
    }
}

/// Clear all scheduled reminders.
#[allow(dead_code)]
pub fn clear_all(state: &NotificationState) {
    for (_, flag) in state.cancel_flags.lock().unwrap().drain() {
        flag.store(true, std::sync::atomic::Ordering::Relaxed);
    }
    state.scheduled.lock().unwrap().clear();
}

/// Deliver a native macOS notification via Tauri plugin.
fn deliver_notification(app: &tauri::AppHandle, title: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app
        .notification()
        .builder()
        .title("小西瓜提醒")
        .body(title)
        .show();
}
