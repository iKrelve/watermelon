// ============================================================
// Tauri v2 IPC Client for 小西瓜 WebView
// Replaces the old Electrobun RPC pattern with Tauri invoke commands
// ============================================================

import { invoke } from '@tauri-apps/api/core'

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

// ============================================================
// Compatibility API Layer
// Provides window.api-like interface for easy migration
// ============================================================

export const api = {
  // Task operations
  createTask: (data: CreateTaskInput) => invoke('create_task', { data }),
  updateTask: (id: string, data: UpdateTaskInput) => invoke('update_task', { id, data }),
  deleteTask: (id: string) => invoke('delete_task', { id }),
  getTasks: (filter?: TaskFilter) => invoke('get_tasks', { filter }),
  getTaskById: (id: string) => invoke('get_task_by_id', { id }),
  completeTask: (id: string) => invoke('complete_task', { id }),
  uncompleteTask: (id: string) => invoke('uncomplete_task', { id }),
  reorderTasks: (items: ReorderTaskItem[]) => invoke('reorder_tasks', { items }),

  // Sub-task operations
  createSubTask: (taskId: string, data: CreateSubTaskInput, parentId?: string) =>
    invoke('create_sub_task', { taskId, data, parentId }),
  updateSubTask: (id: string, data: UpdateSubTaskInput) =>
    invoke('update_sub_task', { id, data }),
  deleteSubTask: (id: string) => invoke('delete_sub_task', { id }),

  // Category operations
  createCategory: (data: CreateCategoryInput) => invoke('create_category', { data }),
  updateCategory: (id: string, data: UpdateCategoryInput) =>
    invoke('update_category', { id, data }),
  deleteCategory: (id: string) => invoke('delete_category', { id }),
  getCategories: () => invoke('get_categories'),

  // Tag operations
  createTag: (name: string, color?: string) => invoke('create_tag', { name, color }),
  updateTag: (id: string, name: string, color?: string) =>
    invoke('update_tag', { id, name, color }),
  deleteTag: (id: string) => invoke('delete_tag', { id }),
  getTags: () => invoke('get_tags'),
  addTagToTask: (taskId: string, tagId: string) =>
    invoke('add_tag_to_task', { taskId, tagId }),
  removeTagFromTask: (taskId: string, tagId: string) =>
    invoke('remove_tag_from_task', { taskId, tagId }),

  // Search
  searchTasks: (query?: string, filters?: TaskFilter) =>
    invoke('search_tasks', { query, filters }),

  // Notifications
  scheduleNotification: (taskId: string, title: string, reminderTime: string) =>
    invoke('schedule_notification', { taskId, title, reminderTime }),
  cancelNotification: (taskId: string) => invoke('cancel_notification', { taskId }),

  // Statistics
  getStats: (period: 'day' | 'week' | 'month') => invoke('get_stats', { period }),
  getDailyTrend: (days: number) => invoke('get_daily_trend', { days }),

  // Data management
  exportData: () => invoke('export_data'),
  importData: (jsonStr: string) => invoke('import_data', { jsonStr }),

  // Window
  setCompactMode: (compact: boolean) => invoke('set_compact_mode', { compact }),
}

// Expose on window for backward compatibility with existing code
// that uses `window.api.xxx()`
;(window as any).api = api
