// ============================================================
// Electrobun RPC Client for 小西瓜 WebView (Renderer)
// Replaces the old Electron preload/contextBridge pattern
// ============================================================

import Electrobun, { Electroview } from 'electrobun/view'

import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
  ReorderTaskItem,
} from '../shared/types'
import type { WatermelonRPC } from '../shared/rpc-schema'

const rpc = Electroview.defineRPC<WatermelonRPC>({
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
