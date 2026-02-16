import { eq, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from '../db/schema'
import { tasks, subTasks, taskTags, tags } from '../db/schema'
import type {
  Task,
  SubTask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  RecurrenceRule,
  TaskFilter,
} from '../../shared/types'
import { getNextOccurrence } from '../utils/recurrence'

export class TaskService {
  constructor(
    private db: BetterSQLite3Database<typeof schema>,
    private rawDb?: Database.Database
  ) {}

  // ---- Validation Helpers ----

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Title must not be empty or whitespace-only')
    }
  }

  // ---- Row to Domain Object ----

  private rowToTask(row: typeof tasks.$inferSelect): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      categoryId: row.categoryId,
      dueDate: row.dueDate,
      reminderTime: row.reminderTime,
      recurrenceRule: row.recurrenceRule ? JSON.parse(row.recurrenceRule) : null,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private rowToSubTask(row: typeof subTasks.$inferSelect): SubTask {
    return {
      id: row.id,
      taskId: row.taskId,
      title: row.title,
      completed: row.completed,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    }
  }

  // ---- Task CRUD ----

  create(input: CreateTaskInput): Task {
    this.validateTitle(input.title)

    const id = uuidv4()
    const now = new Date().toISOString()

    const row = {
      id,
      title: input.title.trim(),
      description: input.description ?? null,
      status: 'todo' as const,
      priority: input.priority ?? ('none' as const),
      categoryId: input.categoryId ?? null,
      dueDate: input.dueDate ?? null,
      reminderTime: input.reminderTime ?? null,
      recurrenceRule: input.recurrenceRule ? JSON.stringify(input.recurrenceRule) : null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    this.db.insert(tasks).values(row).run()
    return this.rowToTask(row)
  }

  getById(id: string): Task | null {
    const row = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!row) return null

    const task = this.rowToTask(row)

    // Load sub-tasks
    const subTaskRows = this.db
      .select()
      .from(subTasks)
      .where(eq(subTasks.taskId, id))
      .orderBy(subTasks.sortOrder)
      .all()
    task.subTasks = subTaskRows.map((r) => this.rowToSubTask(r))

    // Load tags
    const tagRows = this.db
      .select({ tag: tags })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(eq(taskTags.taskId, id))
      .all()
    task.tags = tagRows.map((r) => ({
      id: r.tag.id,
      name: r.tag.name,
      color: r.tag.color,
      createdAt: r.tag.createdAt,
    }))

    return task
  }

  getAll(filter?: TaskFilter): Task[] {
    // Build simple query - filtering is handled by SearchService for complex cases
    let rows: (typeof tasks.$inferSelect)[]

    if (filter?.status) {
      rows = this.db
        .select()
        .from(tasks)
        .where(eq(tasks.status, filter.status))
        .all()
    } else {
      rows = this.db.select().from(tasks).all()
    }

    return rows.map((r) => this.rowToTask(r))
  }

  update(id: string, input: UpdateTaskInput): Task {
    if (input.title !== undefined) {
      this.validateTitle(input.title)
    }

    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!existing) {
      throw new Error('NOT_FOUND: Task not found')
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now }

    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.description !== undefined) updates.description = input.description
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate
    if (input.reminderTime !== undefined) updates.reminderTime = input.reminderTime
    if (input.recurrenceRule !== undefined) {
      updates.recurrenceRule = input.recurrenceRule ? JSON.stringify(input.recurrenceRule) : null
    }

    this.db.update(tasks).set(updates).where(eq(tasks.id, id)).run()

    return this.getById(id)!
  }

  delete(id: string): void {
    // Sub-tasks are cascade-deleted by the database
    // Task-tag associations are also cascade-deleted
    this.db.delete(tasks).where(eq(tasks.id, id)).run()
  }

  /**
   * Mark a task as complete.
   * If the task has a recurrence rule, create a new task instance for the next occurrence.
   * Returns the completed task (and optionally the new recurring instance).
   */
  complete(id: string): { completedTask: Task; nextTask?: Task } {
    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!existing) {
      throw new Error('NOT_FOUND: Task not found')
    }

    const now = new Date().toISOString()

    // Mark as completed
    this.db
      .update(tasks)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(tasks.id, id))
      .run()

    const completedTask = this.getById(id)!

    // If recurring, create next instance
    let nextTask: Task | undefined
    if (existing.recurrenceRule) {
      const rule: RecurrenceRule = JSON.parse(existing.recurrenceRule)
      const currentDate = existing.dueDate ? new Date(existing.dueDate) : new Date()
      const nextDate = getNextOccurrence(rule, currentDate)

      // Check if the next date exceeds the end date
      if (rule.endDate && nextDate > new Date(rule.endDate)) {
        return { completedTask }
      }

      nextTask = this.create({
        title: existing.title,
        description: existing.description ?? undefined,
        priority: existing.priority as Task['priority'],
        categoryId: existing.categoryId ?? undefined,
        dueDate: nextDate.toISOString().split('T')[0],
        reminderTime: existing.reminderTime ?? undefined,
        recurrenceRule: rule,
      })
    }

    return { completedTask, nextTask }
  }

  // ---- Sub-Task CRUD ----

  createSubTask(taskId: string, input: CreateSubTaskInput): SubTask {
    this.validateTitle(input.title)

    // Verify parent task exists
    const parent = this.db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!parent) {
      throw new Error('NOT_FOUND: Parent task not found')
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    // Get max sort order
    const maxOrder = this.db
      .select({ max: sql<number>`MAX(${subTasks.sortOrder})` })
      .from(subTasks)
      .where(eq(subTasks.taskId, taskId))
      .get()

    const row = {
      id,
      taskId,
      title: input.title.trim(),
      completed: false,
      sortOrder: input.sortOrder ?? (maxOrder?.max ?? -1) + 1,
      createdAt: now,
    }

    this.db.insert(subTasks).values(row).run()
    return this.rowToSubTask(row)
  }

  updateSubTask(id: string, input: UpdateSubTaskInput): SubTask {
    if (input.title !== undefined) {
      this.validateTitle(input.title)
    }

    const existing = this.db.select().from(subTasks).where(eq(subTasks.id, id)).get()
    if (!existing) {
      throw new Error('NOT_FOUND: Sub-task not found')
    }

    const updates: Record<string, unknown> = {}
    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.completed !== undefined) updates.completed = input.completed
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder

    if (Object.keys(updates).length > 0) {
      this.db.update(subTasks).set(updates).where(eq(subTasks.id, id)).run()
    }

    const updated = this.db.select().from(subTasks).where(eq(subTasks.id, id)).get()
    return this.rowToSubTask(updated!)
  }

  deleteSubTask(id: string): void {
    this.db.delete(subTasks).where(eq(subTasks.id, id)).run()
  }

  getSubTasks(taskId: string): SubTask[] {
    const rows = this.db
      .select()
      .from(subTasks)
      .where(eq(subTasks.taskId, taskId))
      .orderBy(subTasks.sortOrder)
      .all()
    return rows.map((r) => this.rowToSubTask(r))
  }

  /**
   * Get the total number of tasks in the database.
   */
  count(filter?: { status?: string }): number {
    if (filter?.status) {
      const result = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tasks)
        .where(eq(tasks.status, filter.status))
        .get()
      return result?.count ?? 0
    }
    const result = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .get()
    return result?.count ?? 0
  }
}
