import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
  AppError,
} from '../../shared/types'
import { TaskService } from '../services/task.service'
import { CategoryService } from '../services/category.service'
import { TagService } from '../services/tag.service'
import { SearchService } from '../services/search.service'
import { NotificationService } from '../services/notification.service'
import { StatisticsService } from '../services/statistics.service'
import { DataService } from '../services/data.service'

function wrapError(error: unknown): AppError {
  if (error instanceof Error) {
    const [code, ...messageParts] = error.message.split(': ')
    return {
      code: code || 'UNKNOWN_ERROR',
      message: messageParts.join(': ') || error.message,
    }
  }
  return { code: 'UNKNOWN_ERROR', message: String(error) }
}

function handleAsync<T>(fn: () => T): T | { __error: AppError } {
  try {
    return fn()
  } catch (error) {
    return { __error: wrapError(error) }
  }
}

export function registerIpcHandlers(
  taskService: TaskService,
  categoryService: CategoryService,
  tagService: TagService,
  searchService: SearchService,
  notificationService: NotificationService,
  statisticsService: StatisticsService,
  dataService: DataService
): void {
  // === Task Operations ===

  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, (_event, data: CreateTaskInput) => {
    return handleAsync(() => {
      const task = taskService.create(data)
      // Schedule notification if reminder is set
      if (data.reminderTime) {
        notificationService.schedule(task.id, task.title, new Date(data.reminderTime))
      }
      return task
    })
  })

  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, (_event, id: string, data: UpdateTaskInput) => {
    return handleAsync(() => {
      const task = taskService.update(id, data)
      // Handle notification updates
      if (data.reminderTime !== undefined) {
        if (data.reminderTime) {
          notificationService.reschedule(id, task.title, new Date(data.reminderTime))
        } else {
          notificationService.cancel(id)
        }
      }
      return task
    })
  })

  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, (_event, id: string) => {
    return handleAsync(() => {
      notificationService.cancel(id)
      taskService.delete(id)
    })
  })

  ipcMain.handle(IPC_CHANNELS.TASK_GET_ALL, (_event, filter?: TaskFilter) => {
    return handleAsync(() => taskService.getAll(filter))
  })

  ipcMain.handle(IPC_CHANNELS.TASK_GET_BY_ID, (_event, id: string) => {
    return handleAsync(() => taskService.getById(id))
  })

  ipcMain.handle(IPC_CHANNELS.TASK_COMPLETE, (_event, id: string) => {
    return handleAsync(() => {
      const result = taskService.complete(id)
      notificationService.cancel(id)
      // If recurring and next task has a reminder, schedule it
      if (result.nextTask?.reminderTime) {
        notificationService.schedule(
          result.nextTask.id,
          result.nextTask.title,
          new Date(result.nextTask.reminderTime)
        )
      }
      return result
    })
  })

  // === Sub-Task Operations ===

  ipcMain.handle(
    IPC_CHANNELS.SUBTASK_CREATE,
    (_event, taskId: string, data: CreateSubTaskInput) => {
      return handleAsync(() => taskService.createSubTask(taskId, data))
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SUBTASK_UPDATE,
    (_event, id: string, data: UpdateSubTaskInput) => {
      return handleAsync(() => taskService.updateSubTask(id, data))
    }
  )

  ipcMain.handle(IPC_CHANNELS.SUBTASK_DELETE, (_event, id: string) => {
    return handleAsync(() => taskService.deleteSubTask(id))
  })

  // === Category Operations ===

  ipcMain.handle(IPC_CHANNELS.CATEGORY_CREATE, (_event, data: CreateCategoryInput) => {
    return handleAsync(() => categoryService.create(data))
  })

  ipcMain.handle(
    IPC_CHANNELS.CATEGORY_UPDATE,
    (_event, id: string, data: UpdateCategoryInput) => {
      return handleAsync(() => categoryService.update(id, data))
    }
  )

  ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, (_event, id: string) => {
    return handleAsync(() => categoryService.delete(id))
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORY_GET_ALL, () => {
    return handleAsync(() => categoryService.getAll())
  })

  // === Tag Operations ===

  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, (_event, name: string, color?: string) => {
    return handleAsync(() => tagService.create(name, color))
  })

  ipcMain.handle(
    IPC_CHANNELS.TAG_UPDATE,
    (_event, id: string, name: string, color?: string) => {
      return handleAsync(() => tagService.update(id, name, color))
    }
  )

  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, (_event, id: string) => {
    return handleAsync(() => tagService.delete(id))
  })

  ipcMain.handle(IPC_CHANNELS.TAG_GET_ALL, () => {
    return handleAsync(() => tagService.getAll())
  })

  ipcMain.handle(
    IPC_CHANNELS.TASK_TAG_ADD,
    (_event, taskId: string, tagId: string) => {
      return handleAsync(() => tagService.addToTask(taskId, tagId))
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.TASK_TAG_REMOVE,
    (_event, taskId: string, tagId: string) => {
      return handleAsync(() => tagService.removeFromTask(taskId, tagId))
    }
  )

  // === Search ===

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_TASKS,
    (_event, query?: string, filters?: TaskFilter) => {
      return handleAsync(() => searchService.search(query, filters))
    }
  )

  // === Notifications ===

  ipcMain.handle(
    IPC_CHANNELS.NOTIFICATION_SCHEDULE,
    (_event, taskId: string, title: string, reminderTime: string) => {
      return handleAsync(() =>
        notificationService.schedule(taskId, title, new Date(reminderTime))
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_CANCEL, (_event, taskId: string) => {
    return handleAsync(() => notificationService.cancel(taskId))
  })

  // === Statistics ===

  ipcMain.handle(
    IPC_CHANNELS.STATS_GET,
    (_event, period: 'day' | 'week' | 'month') => {
      return handleAsync(() => statisticsService.getStats(period))
    }
  )

  ipcMain.handle(IPC_CHANNELS.STATS_DAILY_TREND, (_event, days: number) => {
    return handleAsync(() => statisticsService.getDailyTrend(days))
  })

  // === Data Management ===

  ipcMain.handle(IPC_CHANNELS.DATA_EXPORT, () => {
    return handleAsync(() => dataService.exportData())
  })

  ipcMain.handle(IPC_CHANNELS.DATA_IMPORT, (_event, jsonStr: string) => {
    return handleAsync(() => dataService.importData(jsonStr))
  })
}