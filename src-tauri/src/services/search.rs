use rusqlite::Connection;
use crate::models::*;
use crate::services::tag::find_task_ids_by_tags;

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

pub fn search_tasks(conn: &Connection, query: Option<String>, filters: Option<TaskFilter>) -> Result<Vec<Task>, AppError> {
    let mut conditions: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    #[allow(unused_assignments)]
    let mut param_idx: usize = 1;

    // Text search
    if let Some(ref q) = query {
        let trimmed = q.trim();
        if !trimmed.is_empty() {
            let search_term = format!("%{}%", trimmed);
            conditions.push(format!("(title LIKE ?{} OR description LIKE ?{})", param_idx, param_idx + 1));
            values.push(Box::new(search_term.clone()));
            values.push(Box::new(search_term));
            param_idx += 2;
        }
    }

    if let Some(ref f) = filters {
        if let Some(ref status) = f.status {
            conditions.push(format!("status = ?{}", param_idx));
            values.push(Box::new(status.clone()));
            param_idx += 1;
        }

        if let Some(ref cat_opt) = f.category_id {
            match cat_opt {
                None => {
                    conditions.push("category_id IS NULL".to_string());
                }
                Some(cat_id) => {
                    conditions.push(format!("category_id = ?{}", param_idx));
                    values.push(Box::new(cat_id.clone()));
                    param_idx += 1;
                }
            }
        }

        if let Some(ref priority) = f.priority {
            conditions.push(format!("priority = ?{}", param_idx));
            values.push(Box::new(priority.clone()));
            param_idx += 1;
        }

        if let Some(ref from) = f.due_date_from {
            conditions.push(format!("due_date >= ?{}", param_idx));
            values.push(Box::new(from.clone()));
            param_idx += 1;
        }

        if let Some(ref to) = f.due_date_to {
            conditions.push(format!("due_date <= ?{}", param_idx));
            values.push(Box::new(to.clone()));
            param_idx += 1;
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Sort
    let sort_by = filters
        .as_ref()
        .and_then(|f| f.sort_by.clone())
        .unwrap_or_else(|| "createdAt".to_string());
    let sort_order = filters
        .as_ref()
        .and_then(|f| f.sort_order.clone())
        .unwrap_or_else(|| "desc".to_string());

    let order_clause = match sort_by.as_str() {
        "priority" => {
            let dir = if sort_order == "asc" { "ASC" } else { "DESC" };
            format!(
                "ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 WHEN 'none' THEN 3 END {}",
                dir
            )
        }
        "dueDate" => {
            let dir = if sort_order == "asc" { "ASC" } else { "DESC" };
            format!("ORDER BY due_date {}", dir)
        }
        _ => {
            let dir = if sort_order == "asc" { "ASC" } else { "DESC" };
            format!("ORDER BY created_at {}", dir)
        }
    };

    let sql = format!("SELECT * FROM tasks {} {}", where_clause, order_clause);
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();

    let mut results: Vec<Task> = stmt
        .query_map(params_refs.as_slice(), row_to_task)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?
        .filter_map(|r| r.ok())
        .collect();

    // Tag filter (post-query)
    if let Some(ref f) = filters {
        if let Some(ref tag_ids) = f.tag_ids {
            if !tag_ids.is_empty() {
                let matching_ids: std::collections::HashSet<String> =
                    find_task_ids_by_tags(conn, tag_ids)?.into_iter().collect();
                results.retain(|t| matching_ids.contains(&t.id));
            }
        }
    }

    Ok(results)
}
