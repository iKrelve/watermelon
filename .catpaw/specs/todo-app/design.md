# Design Document: Watermelon Todo App

## Overview

Watermelon 是一款基于 Electron + React + TypeScript + TailwindCSS + shadcn/ui + SQLite 的 macOS Todo 管理桌面应用。采用 Electron 的主进程/渲染进程分离架构：主进程负责 SQLite 数据库操作、macOS 系统通知调度等原生能力；渲染进程运行 React + shadcn/ui 构建的 Things 3 风格 UI。两者通过 IPC（Inter-Process Communication）进行类型安全的通信。

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron App                              │
│                                                                   │
│  ┌──────────────────────┐    IPC     ┌──────────────────────────┐│
│  │    Main Process       │◄─────────►│    Renderer Process       ││
│  │                       │           │                           ││
│  │  ┌─────────────────┐ │           │  ┌──────────────────────┐ ││
│  │  │  Task_Store      │ │           │  │  React App           │ ││
│  │  │  (SQLite/better  │ │           │  │  ┌────────────────┐  │ ││
│  │  │  -sqlite3)       │ │           │  │  │ shadcn/ui      │  │ ││
│  │  └─────────────────┘ │           │  │  │ Components     │  │ ││
│  │  ┌─────────────────┐ │           │  │  └────────────────┘  │ ││
│  │  │Notification_Svc  │ │           │  │  ┌────────────────┐  │ ││
│  │  │(Electron         │ │           │  │  │ State Mgmt     │  │ ││
│  │  │ Notification)    │ │           │  │  │ (React Context │  │ ││
│  │  └─────────────────┘ │           │  │  │  + useReducer)  │  │ ││
│  │  ┌─────────────────┐ │           │  │  └────────────────┘  │ ││
│  │  │ Search_Engine    │ │           │  └──────────────────────┘ ││
│  │  │ (SQLite FTS5)    │ │           │                           ││
│  │  └─────────────────┘ │           │                           ││
│  │  ┌─────────────────┐ │           │                           ││
│  │  │Statistics_Engine │ │           │                           ││
│  │  │ (SQL aggregates)│ │           │                           ││
│  │  └─────────────────┘ │           │                           ││
│  └──────────────────────┘           └──────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 技术选型

| 层         | 技术                          | 理由                                            |
|-----------|-------------------------------|------------------------------------------------|
| 数据库     | better-sqlite3                | 同步 API，适合 Electron 主进程，性能优异，支持 FTS5       |
| ORM/查询   | drizzle-orm + drizzle-kit     | 类型安全的 SQL 构建，轻量，支持迁移                      |
| UI 组件    | shadcn/ui                     | 基于 Radix UI 的可定制组件，与 TailwindCSS 完美集成      |
| 状态管理   | React Context + useReducer    | 轻量方案，避免引入过多依赖；通过 IPC 与主进程同步           |
| 图表       | recharts                      | 基于 React 的轻量图表库，shadcn/ui 内置支持              |
| 日期处理   | date-fns                      | 轻量函数式日期库，支持国际化，tree-shakeable              |
| 测试       | vitest + fast-check           | Vitest 与 Vite 生态集成，fast-check 支持属性测试         |
| 迁移       | drizzle-kit                   | 自动 schema diff 生成迁移文件                          |

### IPC 通信架构

采用类型安全的 IPC 通道设计，主进程暴露服务接口，渲染进程通过 preload 脚本调用：

```typescript
// shared/ipc-channels.ts - 共享 IPC 通道定义
export const IPC_CHANNELS = {
  // Task operations
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_GET_ALL: 'task:getAll',
  TASK_GET_BY_ID: 'task:getById',
  TASK_COMPLETE: 'task:complete',
  
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
} as const
```

```typescript
// preload/index.ts - 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('api', {
  // Task
  createTask: (data: CreateTaskInput) => ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, data),
  updateTask: (data: UpdateTaskInput) => ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, data),
  deleteTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, id),
  getTasks: (filter?: TaskFilter) => ipcRenderer.invoke(IPC_CHANNELS.TASK_GET_ALL, filter),
  completeTask: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASK_COMPLETE, id),
  // ... 其他方法
})
```

## Components and Interfaces

### Main Process 服务

#### TaskService

负责 Task 和 Sub-Task 的 CRUD 操作。

```typescript
interface TaskService {
  create(input: CreateTaskInput): Task
  getById(id: string): Task | null
  getAll(filter?: TaskFilter): Task[]
  update(id: string, input: UpdateTaskInput): Task
  delete(id: string): void
  complete(id: string): Task  // 处理完成逻辑，含 recurring task 下次实例创建
  
  // Sub-task
  createSubTask(taskId: string, input: CreateSubTaskInput): SubTask
  updateSubTask(id: string, input: UpdateSubTaskInput): SubTask
  deleteSubTask(id: string): void
}
```

#### CategoryService

```typescript
interface CategoryService {
  create(input: CreateCategoryInput): Category
  getAll(): Category[]
  update(id: string, input: UpdateCategoryInput): Category
  delete(id: string): void  // 将关联任务的 categoryId 设为 null
}
```

#### TagService

```typescript
interface TagService {
  create(name: string): Tag
  getAll(): Tag[]
  delete(id: string): void
  addToTask(taskId: string, tagId: string): void
  removeFromTask(taskId: string, tagId: string): void
}
```

#### SearchService

```typescript
interface SearchService {
  search(query: string, filters?: TaskFilter): Task[]
}

interface TaskFilter {
  categoryId?: string | null
  tagIds?: string[]
  priority?: Priority
  status?: TaskStatus
  dueDateFrom?: Date
  dueDateTo?: Date
  sortBy?: 'dueDate' | 'priority' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}
```

#### NotificationService

```typescript
interface NotificationService {
  schedule(taskId: string, reminderTime: Date): void
  cancel(taskId: string): void
  reschedule(taskId: string, newTime: Date): void
  checkMissedReminders(): void  // 应用启动时调用
}
```

#### StatisticsService

```typescript
interface StatisticsService {
  getStats(period: 'day' | 'week' | 'month'): StatsSummary
  getDailyTrend(days: number): DailyTrend[]
}

interface StatsSummary {
  totalTasks: number
  completedTasks: number
  completionRate: number
  periodStart: Date
  periodEnd: Date
}

interface DailyTrend {
  date: string  // ISO date string
  completed: number
  created: number
}
```

### Renderer 组件树

```
App
├── Sidebar (shadcn/ui ScrollArea)
│   ├── SmartFilters (Today / Upcoming / All)
│   ├── CategoryList (shadcn/ui Collapsible)
│   │   └── CategoryItem
│   └── TagList
│       └── TagItem
├── TaskListPanel
│   ├── TaskListHeader (搜索框 shadcn/ui Command, 排序 shadcn/ui DropdownMenu)
│   ├── TaskList (shadcn/ui ScrollArea)
│   │   └── TaskItem (shadcn/ui Checkbox + 优先级标识)
│   └── AddTaskBar (shadcn/ui Input + 快捷操作)
└── DetailPanel
    ├── TaskDetailHeader (标题编辑, 状态, 删除)
    ├── TaskProperties (优先级 shadcn/ui Select, 日期 shadcn/ui Calendar/Popover, 分类, 标签)
    ├── TaskDescription (shadcn/ui Textarea)
    ├── SubTaskList
    │   └── SubTaskItem (shadcn/ui Checkbox + Input)
    ├── RecurrenceSettings (shadcn/ui Select + 自定义配置)
    └── ReminderSettings (shadcn/ui Popover + Calendar + TimePicker)

StatisticsView (独立视图，通过 sidebar 切换)
├── SummaryCards (今日/本周/本月完成数)
├── CompletionRateChart (recharts PieChart)
└── DailyTrendChart (recharts AreaChart)
```

### shadcn/ui 组件使用计划

| 场景             | shadcn/ui 组件                      |
|-----------------|-------------------------------------|
| 任务创建/编辑     | Input, Textarea, Button, Dialog     |
| 优先级选择        | Select                              |
| 日期选择         | Popover + Calendar                   |
| 标签管理         | Badge, Command (搜索选择)             |
| 分类导航         | Collapsible, ScrollArea              |
| 任务列表         | Checkbox, ScrollArea                 |
| 搜索            | Command                              |
| 排序/筛选        | DropdownMenu                         |
| 确认弹窗         | AlertDialog                          |
| 错误提示         | Toast (sonner)                       |
| 键盘快捷键提示    | Tooltip                              |
| 统计图表         | Card (容器) + recharts               |
| 侧边栏          | Sidebar (shadcn/ui sidebar 组件)      |

## Data Models

### SQLite Schema (drizzle-orm)

```typescript
// tasks table
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),           // UUID
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'completed'] }).notNull().default('todo'),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] }).notNull().default('none'),
  categoryId: text('category_id').references(() => categories.id),
  dueDate: text('due_date'),             // ISO 8601 date string
  reminderTime: text('reminder_time'),    // ISO 8601 datetime string
  recurrenceRule: text('recurrence_rule'), // JSON string of RecurrenceRule
  completedAt: text('completed_at'),      // ISO 8601 datetime string
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// sub_tasks table
export const subTasks = sqliteTable('sub_tasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

// categories table
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),                   // hex color code
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

// tags table
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
})

// task_tags junction table
export const taskTags = sqliteTable('task_tags', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.tagId] }),
}))

// FTS5 virtual table for full-text search
// CREATE VIRTUAL TABLE tasks_fts USING fts5(title, description, content=tasks, content_rowid=rowid);
```

### TypeScript Types

```typescript
interface Task {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'completed'
  priority: 'none' | 'low' | 'medium' | 'high'
  categoryId: string | null
  dueDate: string | null        // ISO date
  reminderTime: string | null   // ISO datetime
  recurrenceRule: RecurrenceRule | null
  completedAt: string | null    // ISO datetime
  createdAt: string
  updatedAt: string
  // Relations (populated when needed)
  subTasks?: SubTask[]
  tags?: Tag[]
  category?: Category | null
}

interface SubTask {
  id: string
  taskId: string
  title: string
  completed: boolean
  sortOrder: number
  createdAt: string
}

interface Category {
  id: string
  name: string
  color: string | null
  sortOrder: number
  createdAt: string
}

interface Tag {
  id: string
  name: string
  color: string | null
  createdAt: string
}

interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval: number          // e.g., every 2 weeks → type='weekly', interval=2
  daysOfWeek?: number[]     // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number       // 1-31 for monthly
  endDate?: string          // ISO date, optional end date
}

// Input types
interface CreateTaskInput {
  title: string
  description?: string
  priority?: 'none' | 'low' | 'medium' | 'high'
  categoryId?: string
  dueDate?: string
  reminderTime?: string
  recurrenceRule?: RecurrenceRule
}

interface UpdateTaskInput {
  title?: string
  description?: string | null
  priority?: 'none' | 'low' | 'medium' | 'high'
  categoryId?: string | null
  dueDate?: string | null
  reminderTime?: string | null
  recurrenceRule?: RecurrenceRule | null
}

interface CreateSubTaskInput {
  title: string
  sortOrder?: number
}

interface UpdateSubTaskInput {
  title?: string
  completed?: boolean
  sortOrder?: number
}

interface CreateCategoryInput {
  name: string
  color?: string
}

interface UpdateCategoryInput {
  name?: string
  color?: string
  sortOrder?: number
}
```

### Recurrence Rule 下一日期计算

```typescript
function getNextOccurrence(rule: RecurrenceRule, currentDate: Date): Date {
  switch (rule.type) {
    case 'daily':
      return addDays(currentDate, rule.interval)
    case 'weekly':
      return addWeeks(currentDate, rule.interval) // 如果指定 daysOfWeek，找下一个匹配日
    case 'monthly':
      // 使用 date-fns addMonths，自动处理月末 (e.g., Jan 31 + 1 month = Feb 28)
      return clampToValidDate(addMonths(currentDate, rule.interval), rule.dayOfMonth)
    case 'custom':
      return addDays(currentDate, rule.interval)
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

以下属性基于需求验收标准推导，使用 **fast-check** 库进行属性测试。

### Property 1: Valid task creation grows the task list

*For any* non-empty, non-whitespace-only title string, creating a task with that title SHALL result in the task list length growing by exactly one, and the new task SHALL have the provided title.

**Validates: Requirements 1.1**

---

### Property 2: Whitespace-only input rejection

*For any* string composed entirely of whitespace characters (including the empty string), attempting to create a task or sub-task with that string as a title SHALL be rejected, and the task/sub-task list SHALL remain unchanged.

**Validates: Requirements 1.2, 2.5**

---

### Property 3: Task edit persistence (round-trip)

*For any* existing task and any valid set of property changes (title, description, priority, categoryId, dueDate), updating the task and then retrieving it by ID SHALL return a task with the updated property values matching exactly.

**Validates: Requirements 1.4**

---

### Property 4: Task deletion cascades to sub-tasks

*For any* task that has zero or more sub-tasks, deleting the task SHALL result in both the task and all its sub-tasks being absent from the database.

**Validates: Requirements 1.5, 2.4**

---

### Property 5: Completion sets status and timestamp

*For any* task in "todo" status, marking it as complete SHALL set the status to "completed" and record a non-null completion timestamp that is not in the future.

**Validates: Requirements 1.6**

---

### Property 6: Sub-task completion toggle is idempotent

*For any* sub-task, toggling its completion status twice SHALL return it to its original completion state.

**Validates: Requirements 2.2**

---

### Property 7: Category filter returns exact matches

*For any* set of tasks distributed across multiple categories, filtering by a specific categoryId SHALL return exactly those tasks whose categoryId matches, and no others.

**Validates: Requirements 3.3**

---

### Property 8: Category deletion nullifies task references

*For any* category that has one or more tasks assigned to it, deleting the category SHALL set the categoryId of all those tasks to null, and the total number of tasks SHALL remain unchanged.

**Validates: Requirements 3.4**

---

### Property 9: Duplicate category name rejection

*For any* existing category name, attempting to create another category with the same name SHALL be rejected, and the categories list SHALL remain unchanged.

**Validates: Requirements 3.5**

---

### Property 10: Tag multi-filter returns intersection

*For any* set of tasks with various tag assignments and any subset of tag IDs used as a filter, the search results SHALL contain exactly those tasks that have ALL of the selected tags assigned to them.

**Validates: Requirements 4.3, 8.2**

---

### Property 11: Priority sort ordering

*For any* list of tasks with randomly assigned priorities, sorting by priority in descending order SHALL produce a list where High < Medium < Low < None never appears (i.e., every task's priority is >= the next task's priority in rank order).

**Validates: Requirements 5.3**

---

### Property 12: Overdue detection accuracy

*For any* task with a due date in the past and status "todo", the overdue detection function SHALL return true. *For any* task with a due date in the future or with status "completed", the overdue detection function SHALL return false.

**Validates: Requirements 6.2**

---

### Property 13: Today and Upcoming filter correctness

*For any* set of tasks with randomly assigned due dates, the "Today" filter SHALL return exactly those incomplete tasks with dueDate equal to the current date, and the "Upcoming" filter SHALL return exactly those incomplete tasks with dueDate within the next 7 days, ordered by dueDate ascending.

**Validates: Requirements 6.4, 6.5**

---

### Property 14: Recurring task next-occurrence generation

*For any* recurring task with a valid RecurrenceRule, completing the task SHALL produce a new task instance whose dueDate equals the expected next occurrence date computed from the rule. The original task's status SHALL be "completed" and the new task's status SHALL be "todo".

**Validates: Requirements 7.2**

---

### Property 15: Invalid recurrence date adjustment

*For any* monthly recurrence rule with dayOfMonth > 28, when the next month has fewer days, the computed next occurrence date SHALL be the last valid day of that month (e.g., dayOfMonth=31 in February → February 28/29).

**Validates: Requirements 7.5**

---

### Property 16: Search case-insensitivity

*For any* task title and any case-permutation of a substring of that title used as a search query, the Search_Engine SHALL include that task in the results.

**Validates: Requirements 8.1, 8.4**

---

### Property 17: Notification schedule/cancel lifecycle

*For any* task with a reminder time set, scheduling a notification and then cancelling it SHALL result in no pending notifications for that task. Rescheduling SHALL result in exactly one pending notification at the new time.

**Validates: Requirements 9.1, 9.3, 9.4**

---

### Property 18: Statistics accuracy

*For any* set of tasks with known completion timestamps, the Statistics_Engine SHALL compute completedTasks count equal to the count of tasks with completedAt within the given period, and completionRate SHALL equal completedTasks / totalTasks (or 0 if totalTasks is 0).

**Validates: Requirements 10.1, 10.2, 10.3**

---

### Property 19: Task serialization round-trip

*For any* valid Task object, serializing it to a database record and deserializing it back SHALL produce an object equivalent to the original (all fields match including nested RecurrenceRule JSON).

**Validates: Requirements 11.4**

---

### Property 20: Transaction atomicity

*For any* operation that modifies multiple records (e.g., deleting a task with sub-tasks, or deleting a category with tasks), if any part of the operation fails, none of the modifications SHALL be persisted.

**Validates: Requirements 11.5**

## Error Handling

### 错误处理策略

| 层         | 错误类型               | 处理方式                                    |
|-----------|----------------------|---------------------------------------------|
| Main 数据层 | 数据库读写异常          | 捕获异常，通过 IPC 返回结构化错误对象                |
| Main 数据层 | 数据验证失败           | 返回 ValidationError，包含具体字段和原因             |
| Main 通知层 | macOS 通知 API 失败   | 记录日志，返回降级提示（不影响核心功能）                |
| IPC 通信    | 通道异常              | 渲染进程超时处理，显示重试提示                        |
| Renderer   | API 调用失败          | 使用 shadcn/ui Toast（sonner）显示用户友好的错误信息   |
| Renderer   | 组件渲染异常           | React ErrorBoundary 兜底，显示回退 UI             |

### 错误类型定义

```typescript
interface AppError {
  code: string          // 如 'VALIDATION_ERROR', 'DB_ERROR', 'NOT_FOUND'
  message: string       // 用户友好的错误描述
  details?: Record<string, string>  // 具体字段错误信息
}
```

## Testing Strategy

### 测试框架

- **vitest**: 单元测试和集成测试框架，与 Vite 生态无缝集成
- **fast-check**: 属性测试库，用于验证正确性属性

### 测试分层

| 层       | 范围                        | 工具          | 目的                  |
|---------|-----------------------------|--------------|----------------------|
| 属性测试  | 数据层服务、业务逻辑           | fast-check   | 验证正确性属性（Property 1-20）|
| 单元测试  | 工具函数、日期计算、数据验证    | vitest       | 覆盖边界情况和具体示例         |
| 集成测试  | IPC 通信、服务间协作           | vitest       | 验证端到端数据流              |

### 属性测试配置

- 每个属性测试运行 **最少 100 次迭代**
- 每个测试用注释标注对应的设计属性编号
- 标签格式: `Feature: todo-app, Property {N}: {property_text}`

### 测试目录结构

```
src/
  main/
    services/__tests__/
      task.service.test.ts       // Property 1-5, 19
      task.service.props.test.ts // Property-based tests
      category.service.test.ts   // Property 7-9
      tag.service.test.ts        // Property 10
      search.service.test.ts     // Property 16
      recurrence.test.ts         // Property 14, 15
      statistics.service.test.ts // Property 18
      notification.service.test.ts // Property 17
    db/__tests__/
      migration.test.ts          // Property 20 (transaction atomicity)
  renderer/src/
    utils/__tests__/
      priority.test.ts           // Property 11
      date-filters.test.ts       // Property 12, 13
      sub-task.test.ts           // Property 6
```

### 单元测试与属性测试互补

- **属性测试**验证普遍性规律（如 "对所有有效输入，X 成立"），覆盖随机生成的大量输入
- **单元测试**关注具体示例和边界情况（如空数据库、February 29 等特殊情况）
- 避免过多单元测试重复属性测试已覆盖的场景
- 单元测试重点关注：集成点、错误条件、特定边界值

