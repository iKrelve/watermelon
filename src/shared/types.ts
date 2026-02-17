// ============================================================
// Shared Types for 小西瓜 Todo App
// Used by both Main Process and Renderer Process
// ============================================================

// --- Enums / Literal Types ---

export type TaskStatus = 'todo' | 'completed'
export type Priority = 'none' | 'low' | 'medium' | 'high'
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom'

// --- Core Data Types ---

export interface RecurrenceRule {
  type: RecurrenceType
  interval: number // e.g., every 2 weeks → type='weekly', interval=2
  daysOfWeek?: number[] // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number // 1-31 for monthly
  endDate?: string // ISO date string, optional end date
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  categoryId: string | null
  dueDate: string | null // ISO date string (YYYY-MM-DD)
  reminderTime: string | null // ISO datetime string
  recurrenceRule: RecurrenceRule | null
  completedAt: string | null // ISO datetime string
  sortOrder: number // Manual sort order for drag-and-drop reordering
  createdAt: string // ISO datetime string
  updatedAt: string // ISO datetime string
  // Relations (populated when needed)
  subTasks?: SubTask[]
  tags?: Tag[]
  category?: Category | null
}

// --- Reorder Types ---

export interface ReorderTaskItem {
  id: string
  sortOrder: number
}

export interface SubTask {
  id: string
  taskId: string
  title: string
  description: string | null
  priority: Priority
  dueDate: string | null // ISO date string (YYYY-MM-DD)
  completed: boolean
  sortOrder: number
  createdAt: string
}

export interface Category {
  id: string
  name: string
  color: string | null
  sortOrder: number
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  color: string | null
  createdAt: string
}

// --- Input Types ---

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: Priority
  categoryId?: string
  dueDate?: string
  reminderTime?: string
  recurrenceRule?: RecurrenceRule
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  priority?: Priority
  categoryId?: string | null
  dueDate?: string | null
  reminderTime?: string | null
  recurrenceRule?: RecurrenceRule | null
}

export interface CreateSubTaskInput {
  title: string
  description?: string
  priority?: Priority
  dueDate?: string
  sortOrder?: number
}

export interface UpdateSubTaskInput {
  title?: string
  description?: string | null
  priority?: Priority
  dueDate?: string | null
  completed?: boolean
  sortOrder?: number
}

export interface CreateCategoryInput {
  name: string
  color?: string
}

export interface UpdateCategoryInput {
  name?: string
  color?: string
  sortOrder?: number
}

// --- Filter & Search Types ---

export interface TaskFilter {
  categoryId?: string | null
  tagIds?: string[]
  priority?: Priority
  status?: TaskStatus
  dueDateFrom?: string // ISO date
  dueDateTo?: string // ISO date
  sortBy?: 'dueDate' | 'priority' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

// --- Statistics Types ---

export interface StatsSummary {
  totalTasks: number
  completedTasks: number
  completionRate: number
  periodStart: string
  periodEnd: string
}

export interface DailyTrend {
  date: string // ISO date string (YYYY-MM-DD)
  completed: number
  created: number
}

// --- Error Types ---

export interface AppError {
  code: string // e.g., 'VALIDATION_ERROR', 'DB_ERROR', 'NOT_FOUND'
  message: string // User-friendly error description
  details?: Record<string, string> // Field-specific error info
}
