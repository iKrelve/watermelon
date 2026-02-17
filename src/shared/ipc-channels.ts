// ============================================================
// IPC Channel Constants
// Used by Main Process (handlers) and Preload (invokers)
// ============================================================

export const IPC_CHANNELS = {
  // Task operations
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_GET_ALL: 'task:getAll',
  TASK_GET_BY_ID: 'task:getById',
  TASK_COMPLETE: 'task:complete',
  TASK_REORDER: 'task:reorder',

  // Sub-task operations
  SUBTASK_CREATE: 'subtask:create',
  SUBTASK_UPDATE: 'subtask:update',
  SUBTASK_DELETE: 'subtask:delete',

  // Category operations
  CATEGORY_CREATE: 'category:create',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',
  CATEGORY_GET_ALL: 'category:getAll',

  // Tag operations
  TAG_CREATE: 'tag:create',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',
  TAG_GET_ALL: 'tag:getAll',
  TASK_TAG_ADD: 'taskTag:add',
  TASK_TAG_REMOVE: 'taskTag:remove',

  // Search
  SEARCH_TASKS: 'search:tasks',

  // Notification
  NOTIFICATION_SCHEDULE: 'notification:schedule',
  NOTIFICATION_CANCEL: 'notification:cancel',

  // Statistics
  STATS_GET: 'stats:get',
  STATS_DAILY_TREND: 'stats:dailyTrend',

  // Data management
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',

  // Window
  WINDOW_SET_COMPACT_MODE: 'window:setCompactMode',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]