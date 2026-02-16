import { ElectronAPI } from '@electron-toolkit/preload'
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
} from '../shared/types'

type ApiResult<T> = T | { __error: AppError }

interface XiaoXiguaApi {
  // Task
  createTask(data: CreateTaskInput): Promise<ApiResult<Task>>
  updateTask(id: string, data: UpdateTaskInput): Promise<ApiResult<Task>>
  deleteTask(id: string): Promise<ApiResult<void>>
  getTasks(filter?: TaskFilter): Promise<ApiResult<Task[]>>
  getTaskById(id: string): Promise<ApiResult<Task | null>>
  completeTask(id: string): Promise<ApiResult<{ completedTask: Task; nextTask?: Task }>>

  // Sub-task
  createSubTask(taskId: string, data: CreateSubTaskInput): Promise<ApiResult<SubTask>>
  updateSubTask(id: string, data: UpdateSubTaskInput): Promise<ApiResult<SubTask>>
  deleteSubTask(id: string): Promise<ApiResult<void>>

  // Category
  createCategory(data: CreateCategoryInput): Promise<ApiResult<Category>>
  updateCategory(id: string, data: UpdateCategoryInput): Promise<ApiResult<Category>>
  deleteCategory(id: string): Promise<ApiResult<void>>
  getCategories(): Promise<ApiResult<Category[]>>

  // Tag
  createTag(name: string, color?: string): Promise<ApiResult<Tag>>
  deleteTag(id: string): Promise<ApiResult<void>>
  getTags(): Promise<ApiResult<Tag[]>>
  addTagToTask(taskId: string, tagId: string): Promise<ApiResult<void>>
  removeTagFromTask(taskId: string, tagId: string): Promise<ApiResult<void>>

  // Search
  searchTasks(query?: string, filters?: TaskFilter): Promise<ApiResult<Task[]>>

  // Notifications
  scheduleNotification(taskId: string, title: string, reminderTime: string): Promise<ApiResult<void>>
  cancelNotification(taskId: string): Promise<ApiResult<void>>

  // Statistics
  getStats(period: 'day' | 'week' | 'month'): Promise<ApiResult<StatsSummary>>
  getDailyTrend(days: number): Promise<ApiResult<DailyTrend[]>>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: XiaoXiguaApi
  }
}
