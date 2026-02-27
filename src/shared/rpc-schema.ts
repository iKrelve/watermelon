// ============================================================
// Electrobun RPC Schema for 小西瓜 Todo App
// Defines all typed requests between Bun (main) and WebView (renderer)
// ============================================================

import type { RPCSchema } from 'electrobun/bun'
import type {
  Task,
  SubTask,
  Category,
  Tag,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
  StatsSummary,
  DailyTrend,
  AppError,
  ReorderTaskItem,
} from './types'

// Wrapper type for error handling (mirrors existing pattern)
type ApiResult<T> = T | { __error: AppError }

export type WatermelonRPC = {
  bun: RPCSchema<{
    requests: {
      // === Task Operations ===
      createTask: {
        params: { data: CreateTaskInput }
        response: ApiResult<Task>
      }
      updateTask: {
        params: { id: string; data: UpdateTaskInput }
        response: ApiResult<Task>
      }
      deleteTask: {
        params: { id: string }
        response: ApiResult<void>
      }
      getTasks: {
        params: { filter?: TaskFilter }
        response: ApiResult<Task[]>
      }
      getTaskById: {
        params: { id: string }
        response: ApiResult<Task | null>
      }
      completeTask: {
        params: { id: string }
        response: ApiResult<{ completedTask: Task; nextTask?: Task }>
      }
      reorderTasks: {
        params: { items: ReorderTaskItem[] }
        response: ApiResult<void>
      }

      // === Sub-Task Operations ===
      createSubTask: {
        params: { taskId: string; data: CreateSubTaskInput }
        response: ApiResult<SubTask>
      }
      updateSubTask: {
        params: { id: string; data: UpdateSubTaskInput }
        response: ApiResult<SubTask>
      }
      deleteSubTask: {
        params: { id: string }
        response: ApiResult<void>
      }

      // === Category Operations ===
      createCategory: {
        params: { data: CreateCategoryInput }
        response: ApiResult<Category>
      }
      updateCategory: {
        params: { id: string; data: UpdateCategoryInput }
        response: ApiResult<Category>
      }
      deleteCategory: {
        params: { id: string }
        response: ApiResult<void>
      }
      getCategories: {
        params: {}
        response: ApiResult<Category[]>
      }

      // === Tag Operations ===
      createTag: {
        params: { name: string; color?: string }
        response: ApiResult<Tag>
      }
      updateTag: {
        params: { id: string; name: string; color?: string }
        response: ApiResult<Tag>
      }
      deleteTag: {
        params: { id: string }
        response: ApiResult<void>
      }
      getTags: {
        params: {}
        response: ApiResult<Tag[]>
      }
      addTagToTask: {
        params: { taskId: string; tagId: string }
        response: ApiResult<void>
      }
      removeTagFromTask: {
        params: { taskId: string; tagId: string }
        response: ApiResult<void>
      }

      // === Search ===
      searchTasks: {
        params: { query?: string; filters?: TaskFilter }
        response: ApiResult<Task[]>
      }

      // === Notifications ===
      scheduleNotification: {
        params: { taskId: string; title: string; reminderTime: string }
        response: ApiResult<void>
      }
      cancelNotification: {
        params: { taskId: string }
        response: ApiResult<void>
      }

      // === Statistics ===
      getStats: {
        params: { period: 'day' | 'week' | 'month' }
        response: ApiResult<StatsSummary>
      }
      getDailyTrend: {
        params: { days: number }
        response: ApiResult<DailyTrend[]>
      }

      // === Data Management ===
      exportData: {
        params: {}
        response: ApiResult<string>
      }
      importData: {
        params: { jsonStr: string }
        response: ApiResult<void>
      }

      // === Window ===
      setCompactMode: {
        params: { compact: boolean }
        response: void
      }
    }
    messages: {}
  }>
  webview: RPCSchema<{
    requests: {}
    messages: {}
  }>
}
