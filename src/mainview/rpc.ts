// ============================================================
// Electrobun RPC Client for 小西瓜 WebView (Renderer)
// Replaces the old Electron preload/contextBridge pattern
// ============================================================

import Electrobun, { Electroview } from 'electrobun/view'
import type { RPCSchema } from 'electrobun/view'

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
} from '../shared/types'

// Mirror the RPC schema type for the webview side
type ApiResult<T> = T | { __error: AppError }

type WatermelonRPCView = {
  bun: {
    requests: {
      createTask: { params: { data: CreateTaskInput }; response: ApiResult<Task> }
      updateTask: { params: { id: string; data: UpdateTaskInput }; response: ApiResult<Task> }
      deleteTask: { params: { id: string }; response: ApiResult<void> }
      getTasks: { params: { filter?: TaskFilter }; response: ApiResult<Task[]> }
      getTaskById: { params: { id: string }; response: ApiResult<Task | null> }
      completeTask: {
        params: { id: string }
        response: ApiResult<{ completedTask: Task; nextTask?: Task }>
      }
      reorderTasks: { params: { items: ReorderTaskItem[] }; response: ApiResult<void> }
      createSubTask: {
        params: { taskId: string; data: CreateSubTaskInput }
        response: ApiResult<SubTask>
      }
      updateSubTask: {
        params: { id: string; data: UpdateSubTaskInput }
        response: ApiResult<SubTask>
      }
      deleteSubTask: { params: { id: string }; response: ApiResult<void> }
      createCategory: { params: { data: CreateCategoryInput }; response: ApiResult<Category> }
      updateCategory: {
        params: { id: string; data: UpdateCategoryInput }
        response: ApiResult<Category>
      }
      deleteCategory: { params: { id: string }; response: ApiResult<void> }
      getCategories: { params: {}; response: ApiResult<Category[]> }
      createTag: { params: { name: string; color?: string }; response: ApiResult<Tag> }
      updateTag: { params: { id: string; name: string; color?: string }; response: ApiResult<Tag> }
      deleteTag: { params: { id: string }; response: ApiResult<void> }
      getTags: { params: {}; response: ApiResult<Tag[]> }
      addTagToTask: { params: { taskId: string; tagId: string }; response: ApiResult<void> }
      removeTagFromTask: { params: { taskId: string; tagId: string }; response: ApiResult<void> }
      searchTasks: {
        params: { query?: string; filters?: TaskFilter }
        response: ApiResult<Task[]>
      }
      scheduleNotification: {
        params: { taskId: string; title: string; reminderTime: string }
        response: ApiResult<void>
      }
      cancelNotification: { params: { taskId: string }; response: ApiResult<void> }
      getStats: {
        params: { period: 'day' | 'week' | 'month' }
        response: ApiResult<StatsSummary>
      }
      getDailyTrend: { params: { days: number }; response: ApiResult<DailyTrend[]> }
      exportData: { params: {}; response: ApiResult<string> }
      importData: { params: { jsonStr: string }; response: ApiResult<void> }
      setCompactMode: { params: { compact: boolean }; response: void }
    }
    messages: {}
  }
  webview: {
    requests: {}
    messages: {}
  }
}

const rpc = Electroview.defineRPC<WatermelonRPCView>({
  maxRequestTime: 10000,
  handlers: { requests: {}, messages: {} },
})

export const electrobun = new Electrobun.Electroview({ rpc })

// ============================================================
// Compatibility API Layer
// Provides window.api-like interface for easy migration
// ============================================================

export const api = {
  // Task operations
  createTask: (data: CreateTaskInput) => electrobun.rpc!.request.createTask({ data }),
  updateTask: (id: string, data: UpdateTaskInput) =>
    electrobun.rpc!.request.updateTask({ id, data }),
  deleteTask: (id: string) => electrobun.rpc!.request.deleteTask({ id }),
  getTasks: (filter?: TaskFilter) => electrobun.rpc!.request.getTasks({ filter }),
  getTaskById: (id: string) => electrobun.rpc!.request.getTaskById({ id }),
  completeTask: (id: string) => electrobun.rpc!.request.completeTask({ id }),
  reorderTasks: (items: ReorderTaskItem[]) => electrobun.rpc!.request.reorderTasks({ items }),

  // Sub-task operations
  createSubTask: (taskId: string, data: CreateSubTaskInput) =>
    electrobun.rpc!.request.createSubTask({ taskId, data }),
  updateSubTask: (id: string, data: UpdateSubTaskInput) =>
    electrobun.rpc!.request.updateSubTask({ id, data }),
  deleteSubTask: (id: string) => electrobun.rpc!.request.deleteSubTask({ id }),

  // Category operations
  createCategory: (data: CreateCategoryInput) =>
    electrobun.rpc!.request.createCategory({ data }),
  updateCategory: (id: string, data: UpdateCategoryInput) =>
    electrobun.rpc!.request.updateCategory({ id, data }),
  deleteCategory: (id: string) => electrobun.rpc!.request.deleteCategory({ id }),
  getCategories: () => electrobun.rpc!.request.getCategories({}),

  // Tag operations
  createTag: (name: string, color?: string) =>
    electrobun.rpc!.request.createTag({ name, color }),
  updateTag: (id: string, name: string, color?: string) =>
    electrobun.rpc!.request.updateTag({ id, name, color }),
  deleteTag: (id: string) => electrobun.rpc!.request.deleteTag({ id }),
  getTags: () => electrobun.rpc!.request.getTags({}),
  addTagToTask: (taskId: string, tagId: string) =>
    electrobun.rpc!.request.addTagToTask({ taskId, tagId }),
  removeTagFromTask: (taskId: string, tagId: string) =>
    electrobun.rpc!.request.removeTagFromTask({ taskId, tagId }),

  // Search
  searchTasks: (query?: string, filters?: TaskFilter) =>
    electrobun.rpc!.request.searchTasks({ query, filters }),

  // Notifications
  scheduleNotification: (taskId: string, title: string, reminderTime: string) =>
    electrobun.rpc!.request.scheduleNotification({ taskId, title, reminderTime }),
  cancelNotification: (taskId: string) =>
    electrobun.rpc!.request.cancelNotification({ taskId }),

  // Statistics
  getStats: (period: 'day' | 'week' | 'month') =>
    electrobun.rpc!.request.getStats({ period }),
  getDailyTrend: (days: number) => electrobun.rpc!.request.getDailyTrend({ days }),

  // Data management
  exportData: () => electrobun.rpc!.request.exportData({}),
  importData: (jsonStr: string) => electrobun.rpc!.request.importData({ jsonStr }),

  // Window
  setCompactMode: (compact: boolean) =>
    electrobun.rpc!.request.setCompactMode({ compact }),
}

// Expose on window for backward compatibility with existing code
// that uses `window.api.xxx()`
;(window as any).api = api
