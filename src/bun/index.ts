import { BrowserView, BrowserWindow, Updater, Utils, type RPCSchema } from 'electrobun/bun'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { initDatabase, closeDatabase, getRawDatabase } from './db'
import { TaskService } from './services/task.service'
import { CategoryService } from './services/category.service'
import { TagService } from './services/tag.service'
import { SearchService } from './services/search.service'
import { NotificationService } from './services/notification.service'
import { StatisticsService } from './services/statistics.service'
import { DataService } from './services/data.service'
import type { WatermelonRPC } from '../shared/rpc-schema'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
  AppError,
  ReorderTaskItem,
} from '../shared/types'
import { AppException } from '../shared/types'

// ============================================================
// Database & Service Initialization
// ============================================================

// Ensure data directory exists
const dataDir = Utils.paths.userData
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const dbPath = join(dataDir, 'watermelon.db')
const db = initDatabase(dbPath)
const rawDb = getRawDatabase()

const taskService = new TaskService(db, rawDb ?? undefined)
const categoryService = new CategoryService(db)
const tagService = new TagService(db)
const searchService = new SearchService(db, tagService)
const notificationService = new NotificationService(db)
const statisticsService = new StatisticsService(db)
const dataService = new DataService(db)

// Check for missed reminders and schedule future ones
notificationService.checkMissedReminders()
notificationService.scheduleAllFutureReminders()

// ============================================================
// Error Handling Helpers
// ============================================================

function wrapError(error: unknown): AppError {
  if (error instanceof AppException) {
    return error.toAppError()
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', message: error.message }
  }
  return { code: 'UNKNOWN_ERROR', message: String(error) }
}

function handleSync<T>(fn: () => T): T | { __error: AppError } {
  try {
    return fn()
  } catch (error) {
    return { __error: wrapError(error) }
  }
}

// ============================================================
// Compact Mode State
// ============================================================

let savedBounds: { x: number; y: number; width: number; height: number } | null = null

// ============================================================
// RPC Definition
// ============================================================

const DEV_SERVER_PORT = 6689
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`

const watermelonRPC = BrowserView.defineRPC<WatermelonRPC>({
  maxRequestTime: 10000,
  handlers: {
    requests: {
      // === Task Operations ===
      createTask: ({ data }) => {
        return handleSync(() => {
          const task = taskService.create(data)
          if (data.reminderTime) {
            notificationService.schedule(task.id, task.title, new Date(data.reminderTime))
          }
          return task
        })
      },
      updateTask: ({ id, data }) => {
        return handleSync(() => {
          const task = taskService.update(id, data)
          if (data.reminderTime !== undefined) {
            if (data.reminderTime) {
              notificationService.reschedule(id, task.title, new Date(data.reminderTime))
            } else {
              notificationService.cancel(id)
            }
          }
          return task
        })
      },
      deleteTask: ({ id }) => {
        return handleSync(() => {
          notificationService.cancel(id)
          taskService.delete(id)
        })
      },
      getTasks: ({ filter }) => {
        return handleSync(() => taskService.getAll(filter))
      },
      getTaskById: ({ id }) => {
        return handleSync(() => taskService.getById(id))
      },
      completeTask: ({ id }) => {
        return handleSync(() => {
          const result = taskService.complete(id)
          notificationService.cancel(id)
          if (result.nextTask?.reminderTime) {
            notificationService.schedule(
              result.nextTask.id,
              result.nextTask.title,
              new Date(result.nextTask.reminderTime)
            )
          }
          return result
        })
      },
      uncompleteTask: ({ id }) => {
        return handleSync(() => taskService.uncomplete(id))
      },
      reorderTasks: ({ items }) => {
        return handleSync(() => taskService.reorder(items))
      },

      // === Sub-Task Operations ===
      createSubTask: ({ taskId, data }) => {
        return handleSync(() => taskService.createSubTask(taskId, data))
      },
      updateSubTask: ({ id, data }) => {
        return handleSync(() => taskService.updateSubTask(id, data))
      },
      deleteSubTask: ({ id }) => {
        return handleSync(() => taskService.deleteSubTask(id))
      },

      // === Category Operations ===
      createCategory: ({ data }) => {
        return handleSync(() => categoryService.create(data))
      },
      updateCategory: ({ id, data }) => {
        return handleSync(() => categoryService.update(id, data))
      },
      deleteCategory: ({ id }) => {
        return handleSync(() => categoryService.delete(id))
      },
      getCategories: () => {
        return handleSync(() => categoryService.getAll())
      },

      // === Tag Operations ===
      createTag: ({ name, color }) => {
        return handleSync(() => tagService.create(name, color))
      },
      updateTag: ({ id, name, color }) => {
        return handleSync(() => tagService.update(id, name, color))
      },
      deleteTag: ({ id }) => {
        return handleSync(() => tagService.delete(id))
      },
      getTags: () => {
        return handleSync(() => tagService.getAll())
      },
      addTagToTask: ({ taskId, tagId }) => {
        return handleSync(() => tagService.addToTask(taskId, tagId))
      },
      removeTagFromTask: ({ taskId, tagId }) => {
        return handleSync(() => tagService.removeFromTask(taskId, tagId))
      },

      // === Search ===
      searchTasks: ({ query, filters }) => {
        return handleSync(() => searchService.search(query, filters))
      },

      // === Notifications ===
      scheduleNotification: ({ taskId, title, reminderTime }) => {
        return handleSync(() =>
          notificationService.schedule(taskId, title, new Date(reminderTime))
        )
      },
      cancelNotification: ({ taskId }) => {
        return handleSync(() => notificationService.cancel(taskId))
      },

      // === Statistics ===
      getStats: ({ period }) => {
        return handleSync(() => statisticsService.getStats(period))
      },
      getDailyTrend: ({ days }) => {
        return handleSync(() => statisticsService.getDailyTrend(days))
      },

      // === Data Management ===
      exportData: () => {
        return handleSync(() => dataService.exportData())
      },
      importData: ({ jsonStr }) => {
        return handleSync(() => dataService.importData(jsonStr))
      },

      // === Window ===
      setCompactMode: ({ compact }) => {
        const COMPACT_WIDTH = 420
        const COMPACT_HEIGHT = 600

        if (compact) {
          savedBounds = mainWindow.getFrame()
          const currentBounds = savedBounds
          const x = Math.round(currentBounds.x + (currentBounds.width - COMPACT_WIDTH) / 2)
          const y = Math.round(currentBounds.y + (currentBounds.height - COMPACT_HEIGHT) / 2)
          mainWindow.setFrame(x, y, COMPACT_WIDTH, COMPACT_HEIGHT)
        } else {
          if (savedBounds) {
            mainWindow.setFrame(savedBounds.x, savedBounds.y, savedBounds.width, savedBounds.height)
            savedBounds = null
          } else {
            mainWindow.setSize(1200, 800)
          }
        }
      },
    },
    messages: {},
  },
})

// ============================================================
// Window Creation
// ============================================================

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel()
  if (channel === 'dev') {
    try {
      await fetch(DEV_SERVER_URL, { method: 'HEAD' })
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`)
      return DEV_SERVER_URL
    } catch {
      console.log('Vite dev server not running. Run "bun run dev:hmr" for HMR support.')
    }
  }
  return 'views://mainview/index.html'
}

const url = await getMainViewUrl()

const mainWindow = new BrowserWindow({
  title: '小西瓜',
  url,
  rpc: watermelonRPC,
  titleBarStyle: 'hiddenInset',
  frame: {
    width: 1200,
    height: 800,
    x: 200,
    y: 200,
  },
})

// ============================================================
// Cleanup on quit
// ============================================================

import Electrobun from 'electrobun/bun'

Electrobun.events.on('app-before-quit', () => {
  notificationService.clearAll()
  closeDatabase()
})

console.log('小西瓜 app started!')
console.log(`Database: ${dbPath}`)
