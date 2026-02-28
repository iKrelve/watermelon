mod db;
mod models;
mod services;
mod commands;
mod utils;

use db::Database;
use services::notification::NotificationState;
use commands::SavedWindowGeometry;
use std::fs;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            use tauri::Manager;

            // Determine database path
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            if !app_data_dir.exists() {
                fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            }
            let db_path = app_data_dir.join("watermelon.db");

            log::info!("Database path: {:?}", db_path);

            // Initialize database
            let database = Database::new(&db_path).expect("Failed to initialize database");

            // Initialize notification state
            let notification_state = NotificationState::new();

            // Check missed reminders and schedule future ones
            {
                let conn = database.conn.lock().unwrap();
                services::notification::check_missed_reminders(&conn, app.handle());
                services::notification::schedule_all_future_reminders(&conn, &notification_state, app.handle());
            }

            // Register state
            app.manage(database);
            app.manage(notification_state);
            app.manage(SavedWindowGeometry { inner: Mutex::new(None) });

            log::info!("小西瓜 app started!");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_tasks,
            commands::get_task_by_id,
            commands::complete_task,
            commands::uncomplete_task,
            commands::reorder_tasks,
            commands::create_sub_task,
            commands::update_sub_task,
            commands::delete_sub_task,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::get_categories,
            commands::create_tag,
            commands::update_tag,
            commands::delete_tag,
            commands::get_tags,
            commands::add_tag_to_task,
            commands::remove_tag_from_task,
            commands::search_tasks,
            commands::schedule_notification,
            commands::cancel_notification,
            commands::get_stats,
            commands::get_daily_trend,
            commands::export_data,
            commands::import_data,
            commands::set_compact_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
