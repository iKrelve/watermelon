use rusqlite::{Connection, params};
use chrono::{NaiveDate, Datelike, Duration};
use crate::models::*;

pub fn get_stats(conn: &Connection, period: &str) -> Result<StatsSummary, AppError> {
    let now = chrono::Utc::now().naive_utc();
    let today = now.date();

    let (period_start, period_end) = match period {
        "day" => {
            let start = today.and_hms_opt(0, 0, 0).unwrap();
            let end = today.and_hms_opt(23, 59, 59).unwrap();
            (start, end)
        }
        "week" => {
            // Monday as start of week
            let weekday = today.weekday().num_days_from_monday();
            let start_date = today - Duration::days(weekday as i64);
            let end_date = start_date + Duration::days(6);
            (
                start_date.and_hms_opt(0, 0, 0).unwrap(),
                end_date.and_hms_opt(23, 59, 59).unwrap(),
            )
        }
        "month" => {
            let start_date = NaiveDate::from_ymd_opt(today.year(), today.month(), 1).unwrap();
            let next_month = if today.month() == 12 {
                NaiveDate::from_ymd_opt(today.year() + 1, 1, 1).unwrap()
            } else {
                NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1).unwrap()
            };
            let end_date = next_month - Duration::days(1);
            (
                start_date.and_hms_opt(0, 0, 0).unwrap(),
                end_date.and_hms_opt(23, 59, 59).unwrap(),
            )
        }
        _ => {
            return Err(AppError {
                code: "VALIDATION_ERROR".into(),
                message: "Invalid period. Use 'day', 'week', or 'month'".into(),
                details: None,
            });
        }
    };

    let start_str = period_start.format("%Y-%m-%dT%H:%M:%S").to_string();
    let end_str = period_end.format("%Y-%m-%dT%H:%M:%S").to_string();

    let completed_tasks: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND completed_at >= ?1 AND completed_at <= ?2",
            params![start_str, end_str],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_tasks: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE created_at <= ?1",
            params![end_str],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let completion_rate = if total_tasks > 0 {
        completed_tasks as f64 / total_tasks as f64
    } else {
        0.0
    };

    Ok(StatsSummary {
        total_tasks,
        completed_tasks,
        completion_rate,
        period_start: start_str,
        period_end: end_str,
    })
}

pub fn get_daily_trend(conn: &Connection, days: i64) -> Result<Vec<DailyTrend>, AppError> {
    let today = chrono::Utc::now().naive_utc().date();
    let range_start = (today - Duration::days(days - 1)).and_hms_opt(0, 0, 0).unwrap();
    let range_end = today.and_hms_opt(23, 59, 59).unwrap();
    let start_str = range_start.format("%Y-%m-%dT%H:%M:%S").to_string();
    let end_str = range_end.format("%Y-%m-%dT%H:%M:%S").to_string();

    // Completed by date
    let mut stmt = conn
        .prepare(
            "SELECT DATE(completed_at) as d, COUNT(*) as c FROM tasks
             WHERE status = 'completed' AND completed_at >= ?1 AND completed_at <= ?2
             GROUP BY DATE(completed_at)"
        )
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    let completed_rows: Vec<(String, i64)> = stmt
        .query_map(params![start_str, end_str], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();

    // Created by date
    let mut stmt = conn
        .prepare(
            "SELECT DATE(created_at) as d, COUNT(*) as c FROM tasks
             WHERE created_at >= ?1 AND created_at <= ?2
             GROUP BY DATE(created_at)"
        )
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    let created_rows: Vec<(String, i64)> = stmt
        .query_map(params![start_str, end_str], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();

    let completed_map: std::collections::HashMap<String, i64> = completed_rows.into_iter().collect();
    let created_map: std::collections::HashMap<String, i64> = created_rows.into_iter().collect();

    let mut trends = Vec::new();
    for i in (0..days).rev() {
        let date = today - Duration::days(i);
        let date_str = date.format("%Y-%m-%d").to_string();
        trends.push(DailyTrend {
            date: date_str.clone(),
            completed: *completed_map.get(&date_str).unwrap_or(&0),
            created: *created_map.get(&date_str).unwrap_or(&0),
        });
    }

    Ok(trends)
}
