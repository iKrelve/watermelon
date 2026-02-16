import { app, shell, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from './db'
import { TaskService } from './services/task.service'
import { CategoryService } from './services/category.service'
import { TagService } from './services/tag.service'
import { SearchService } from './services/search.service'
import { NotificationService } from './services/notification.service'
import { StatisticsService } from './services/statistics.service'
import { registerIpcHandlers } from './ipc/handlers'

let notificationService: NotificationService | null = null

function initServices(): void {
  const dbPath = join(app.getPath('userData'), 'watermelon.db')
  const db = initDatabase(dbPath)

  const taskService = new TaskService(db)
  const categoryService = new CategoryService(db)
  const tagService = new TagService(db)
  const searchService = new SearchService(db, tagService)
  notificationService = new NotificationService(db)
  const statisticsService = new StatisticsService(db)

  // Register all IPC handlers
  registerIpcHandlers(
    taskService,
    categoryService,
    tagService,
    searchService,
    notificationService,
    statisticsService
  )

  // Check for missed reminders and schedule future ones
  notificationService.checkMissedReminders()
  notificationService.scheduleAllFutureReminders()
}

function createWindow(): void {
  const iconPath = join(app.getAppPath(), 'build/icon_1024.png')
  const appIcon = nativeImage.createFromPath(iconPath)

  // Set macOS dock icon
  if (process.platform === 'darwin' && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon)
  }

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: appIcon,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.xiao-xigua')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database and services before creating window
  initServices()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  // Clean up notification timers
  if (notificationService) {
    notificationService.clearAll()
  }
  // Close database
  closeDatabase()
})
