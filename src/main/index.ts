import { app, shell, BrowserWindow, ipcMain, nativeImage } from 'electron'
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
import { IPC_CHANNELS } from '../shared/ipc-channels'

let notificationService: NotificationService | null = null

// Saved normal-mode window bounds so we can restore after compact mode
let savedBounds: Electron.Rectangle | null = null

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

  // Compact-mode window resizing
  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_COMPACT_MODE, (_event, compact: boolean) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return

    if (compact) {
      // Save current bounds before shrinking
      savedBounds = win.getBounds()
      const COMPACT_WIDTH = 420
      const COMPACT_HEIGHT = 600
      const currentBounds = win.getBounds()
      // Center the compact window relative to the previous position
      const x = Math.round(currentBounds.x + (currentBounds.width - COMPACT_WIDTH) / 2)
      const y = Math.round(currentBounds.y + (currentBounds.height - COMPACT_HEIGHT) / 2)
      win.setMinimumSize(360, 400)
      win.setBounds({ x, y, width: COMPACT_WIDTH, height: COMPACT_HEIGHT }, true)
    } else {
      // Restore previous bounds
      win.setMinimumSize(800, 600)
      if (savedBounds) {
        win.setBounds(savedBounds, true)
        savedBounds = null
      } else {
        win.setBounds({ width: 1200, height: 800 } as Electron.Rectangle, true)
        win.center()
      }
    }
  })

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
