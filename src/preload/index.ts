import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
} from '../shared/types'

// Custom API exposed to renderer
const api = {
  // Task operations
  createTask: (data: CreateTaskInput) => ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, data),
  updateTask: (id: string, data: UpdateTaskInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, id, data),
  deleteTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, id),
  getTasks: (filter?: TaskFilter) => ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_ALL, filter),
  getTaskById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_BY_ID, id),
  completeTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_COMPLETE, id),

  // Sub-task operations
  createSubTask: (taskId: string, data: CreateSubTaskInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_CREATE, taskId, data),
  updateSubTask: (id: string, data: UpdateSubTaskInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_UPDATE, id, data),
  deleteSubTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SUBTASK_DELETE, id),

  // Category operations
  createCategory: (data: CreateCategoryInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, data),
  updateCategory: (id: string, data: UpdateCategoryInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, id, data),
  deleteCategory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),
  getCategories: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_ALL),

  // Tag operations
  createTag: (name: string, color?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, name, color),
  updateTag: (id: string, name: string, color?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_UPDATE, id, name, color),
  deleteTag: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),
  getTags: () => ipcRenderer.invoke(IPC_CHANNELS.TAG_GET_ALL),
  addTagToTask: (taskId: string, tagId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TASK_TAG_ADD, taskId, tagId),
  removeTagFromTask: (taskId: string, tagId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TASK_TAG_REMOVE, taskId, tagId),

  // Search
  searchTasks: (query?: string, filters?: TaskFilter) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_TASKS, query, filters),

  // Notifications
  scheduleNotification: (taskId: string, title: string, reminderTime: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SCHEDULE, taskId, title, reminderTime),
  cancelNotification: (taskId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_CANCEL, taskId),

  // Statistics
  getStats: (period: 'day' | 'week' | 'month') =>
    ipcRenderer.invoke(IPC_CHANNELS.STATS_GET, period),
  getDailyTrend: (days: number) => ipcRenderer.invoke(IPC_CHANNELS.STATS_DAILY_TREND, days),

  // Data management
  exportData: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT),
  importData: (jsonStr: string) => ipcRenderer.invoke(IPC_CHANNELS.DATA_IMPORT, jsonStr),

  // Window
  setCompactMode: (compact: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_COMPACT_MODE, compact),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}