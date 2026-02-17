import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

// ============================================================
// Database Schema for 小西瓜 Todo App
// ============================================================

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'completed'] })
    .notNull()
    .default('todo'),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] })
    .notNull()
    .default('none'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  dueDate: text('due_date'), // ISO 8601 date string (YYYY-MM-DD)
  reminderTime: text('reminder_time'), // ISO 8601 datetime string
  recurrenceRule: text('recurrence_rule'), // JSON string of RecurrenceRule
  completedAt: text('completed_at'), // ISO 8601 datetime string
  sortOrder: integer('sort_order').notNull().default(0), // Manual sort order for drag-and-drop
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const subTasks = sqliteTable('sub_tasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority', { enum: ['none', 'low', 'medium', 'high'] })
    .notNull()
    .default('none'),
  dueDate: text('due_date'), // ISO 8601 date string (YYYY-MM-DD)
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
})

export const taskTags = sqliteTable(
  'task_tags',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.tagId] })]
)
