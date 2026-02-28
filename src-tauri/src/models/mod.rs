use serde::{Deserialize, Serialize};

// ============================================================
// Core Data Types — mirrors src/shared/types.ts
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,       // "todo" | "completed"
    pub priority: String,     // "none" | "low" | "medium" | "high"
    pub category_id: Option<String>,
    pub due_date: Option<String>,
    pub reminder_time: Option<String>,
    pub recurrence_rule: Option<RecurrenceRule>,
    pub completed_at: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_tasks: Option<Vec<SubTask>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<Tag>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<Category>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubTask {
    pub id: String,
    pub task_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub sort_order: i64,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<SubTask>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: String,
}

// ============================================================
// Recurrence Rule
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecurrenceRule {
    #[serde(rename = "type")]
    pub rule_type: String, // "daily" | "weekly" | "monthly" | "custom"
    pub interval: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days_of_week: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub day_of_month: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_date: Option<String>,
}

// ============================================================
// Input Types
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub category_id: Option<String>,
    pub due_date: Option<String>,
    pub reminder_time: Option<String>,
    pub recurrence_rule: Option<RecurrenceRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<Option<String>>,
    pub priority: Option<String>,
    pub category_id: Option<Option<String>>,
    pub due_date: Option<Option<String>>,
    pub reminder_time: Option<Option<String>>,
    pub recurrence_rule: Option<Option<RecurrenceRule>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub sort_order: Option<i64>,
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubTaskInput {
    pub title: Option<String>,
    pub description: Option<Option<String>>,
    pub priority: Option<String>,
    pub due_date: Option<Option<String>>,
    pub completed: Option<bool>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCategoryInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCategoryInput {
    pub name: Option<String>,
    pub color: Option<String>,
    pub sort_order: Option<i64>,
}

// ============================================================
// Filter & Search Types
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TaskFilter {
    pub category_id: Option<Option<String>>,
    pub tag_ids: Option<Vec<String>>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub due_date_from: Option<String>,
    pub due_date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

// ============================================================
// Statistics Types
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsSummary {
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub completion_rate: f64,
    pub period_start: String,
    pub period_end: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyTrend {
    pub date: String,
    pub completed: i64,
    pub created: i64,
}

// ============================================================
// Reorder Types
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTaskItem {
    pub id: String,
    pub sort_order: i64,
}

// ============================================================
// Error Types
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<std::collections::HashMap<String, String>>,
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for AppError {}

// ============================================================
// Complete Task Result
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteTaskResult {
    pub completed_task: Task,
    pub next_task: Option<Task>,
}

// ============================================================
// Data Export/Import
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub version: i64,
    pub exported_at: String,
    pub tasks: Vec<ExportTaskRow>,
    pub sub_tasks: Vec<ExportSubTaskRow>,
    pub categories: Vec<Category>,
    pub tags: Vec<Tag>,
    pub task_tags: Vec<TaskTagRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTaskRow {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub category_id: Option<String>,
    pub due_date: Option<String>,
    pub reminder_time: Option<String>,
    pub recurrence_rule: Option<String>, // JSON string (raw)
    pub completed_at: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSubTaskRow {
    pub id: String,
    pub task_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskTagRow {
    pub task_id: String,
    pub tag_id: String,
}
