import { eq, and, sql, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
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
  ReorderTaskItem,
} from '../../shared/types'
import { AppException } from '../../shared/types'
import { getNextOccurrence } from '../utils/recurrence'
import { rowToTask, rowToSubTask, buildSubTaskTree } from '../utils/mappers'

export class TaskService {
  constructor(
    private db: BunSQLiteDatabase<typeof schema>,
    private rawDb?: Database
  ) {}

  // ---- Validation Helpers ----

  private validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new AppException('VALIDATION_ERROR', 'Title must not be empty or whitespace-only')
    }
  }

  // ---- Task CRUD ----

  create(input: CreateTaskInput): Task {
    this.validateTitle(input.title)

    const id = uuidv4()
    const now = new Date().toISOString()

    // Assign sort_order: new task gets min(sortOrder) - 1 (prepend to list).
    // This avoids the O(N) full-table UPDATE that the previous approach used.
    const minOrder = this.db
      .select({ min: sql<number>`MIN(${tasks.sortOrder})` })
      .from(tasks)
      .get()
    const newSortOrder = (minOrder?.min ?? 0) - 1

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
      sortOrder: newSortOrder,
      createdAt: now,
      updatedAt: now,
    }

    this.db.insert(tasks).values(row).run()
    return rowToTask(row)
  }

  getById(id: string): Task | null {
    const row = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!row) return null

    const task = rowToTask(row)

    // Load sub-tasks and build tree
    const subTaskRows = this.db
      .select()
      .from(subTasks)
      .where(eq(subTasks.taskId, id))
      .orderBy(subTasks.sortOrder)
      .all()
    task.subTasks = buildSubTaskTree(subTaskRows.map((r) => rowToSubTask(r)))

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
        .orderBy(tasks.sortOrder)
        .all()
    } else {
      rows = this.db.select().from(tasks).orderBy(tasks.sortOrder).all()
    }

    const taskList = rows.map((r) => rowToTask(r))
    if (taskList.length === 0) return taskList

    // Batch-load sub-tasks scoped to current task set
    const taskIds = taskList.map((t) => t.id)
    const allSubTasks = this.db
      .select()
      .from(subTasks)
      .where(inArray(subTasks.taskId, taskIds))
      .orderBy(subTasks.sortOrder)
      .all()
    const subTasksByTaskId = new Map<string, typeof allSubTasks>()
    for (const st of allSubTasks) {
      const list = subTasksByTaskId.get(st.taskId) ?? []
      list.push(st)
      subTasksByTaskId.set(st.taskId, list)
    }

    // Batch-load task-tag associations scoped to current task set
    const allTaskTags = this.db
      .select({ taskId: taskTags.taskId, tag: tags })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(inArray(taskTags.taskId, taskIds))
      .all()
    const tagsByTaskId = new Map<string, { id: string; name: string; color: string | null; createdAt: string }[]>()
    for (const row of allTaskTags) {
      const list = tagsByTaskId.get(row.taskId) ?? []
      list.push({ id: row.tag.id, name: row.tag.name, color: row.tag.color, createdAt: row.tag.createdAt })
      tagsByTaskId.set(row.taskId, list)
    }

    // Attach relations to each task
    for (const task of taskList) {
      const stRows = subTasksByTaskId.get(task.id)
      task.subTasks = stRows ? buildSubTaskTree(stRows.map((r) => rowToSubTask(r))) : []
      task.tags = tagsByTaskId.get(task.id) ?? []
    }

    return taskList
  }

  update(id: string, input: UpdateTaskInput): Task {
    if (input.title !== undefined) {
      this.validateTitle(input.title)
    }

    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Task not found')
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
   * Mark a completed task as incomplete (revert to todo).
   */
  uncomplete(id: string): Task {
    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Task not found')
    }

    const now = new Date().toISOString()

    this.db
      .update(tasks)
      .set({
        status: 'todo',
        completedAt: null,
        updatedAt: now,
      })
      .where(eq(tasks.id, id))
      .run()

    return this.getById(id)!
  }

  /**
   * Mark a task as complete.
   * If the task has a recurrence rule, create a new task instance for the next occurrence.
   * Returns the completed task (and optionally the new recurring instance).
   */
  complete(id: string): { completedTask: Task; nextTask?: Task } {
    const existing = this.db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Task not found')
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
    const parentTask = this.db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!parentTask) {
      throw new AppException('NOT_FOUND', 'Parent task not found')
    }

    const parentId = input.parentId ?? null

    // If nesting under a sub-task, verify it exists and belongs to the same task
    if (parentId) {
      const parentSubTask = this.db.select().from(subTasks).where(eq(subTasks.id, parentId)).get()
      if (!parentSubTask) {
        throw new AppException('NOT_FOUND', 'Parent sub-task not found')
      }
      if (parentSubTask.taskId !== taskId) {
        throw new AppException('VALIDATION_ERROR', 'Parent sub-task does not belong to this task')
      }
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    // Get max sort order among siblings (same parentId)
    const siblingConditions = parentId
      ? and(eq(subTasks.taskId, taskId), eq(subTasks.parentId, parentId))
      : and(eq(subTasks.taskId, taskId), sql`${subTasks.parentId} IS NULL`)

    const maxOrder = this.db
      .select({ max: sql<number>`MAX(${subTasks.sortOrder})` })
      .from(subTasks)
      .where(siblingConditions)
      .get()

    const row = {
      id,
      taskId,
      parentId,
      title: input.title.trim(),
      description: input.description ?? null,
      priority: input.priority ?? ('none' as const),
      dueDate: input.dueDate ?? null,
      completed: false,
      sortOrder: input.sortOrder ?? (maxOrder?.max ?? -1) + 1,
      createdAt: now,
    }

    this.db.insert(subTasks).values(row).run()
    return rowToSubTask(row)
  }

  updateSubTask(id: string, input: UpdateSubTaskInput): SubTask {
    if (input.title !== undefined) {
      this.validateTitle(input.title)
    }

    const existing = this.db.select().from(subTasks).where(eq(subTasks.id, id)).get()
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Sub-task not found')
    }

    const updates: Record<string, unknown> = {}
    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.description !== undefined) updates.description = input.description
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate
    if (input.completed !== undefined) updates.completed = input.completed
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder

    if (Object.keys(updates).length > 0) {
      this.db.update(subTasks).set(updates).where(eq(subTasks.id, id)).run()
    }

    const updated = this.db.select().from(subTasks).where(eq(subTasks.id, id)).get()
    return rowToSubTask(updated!)
  }

  deleteSubTask(id: string): void {
    // Recursively delete all descendant sub-tasks first
    this.deleteSubTaskDescendants(id)
    this.db.delete(subTasks).where(eq(subTasks.id, id)).run()
  }

  /**
   * Recursively delete all descendants of a sub-task.
   */
  private deleteSubTaskDescendants(parentId: string): void {
    const children = this.db
      .select({ id: subTasks.id })
      .from(subTasks)
      .where(eq(subTasks.parentId, parentId))
      .all()
    for (const child of children) {
      this.deleteSubTaskDescendants(child.id)
      this.db.delete(subTasks).where(eq(subTasks.id, child.id)).run()
    }
  }

  getSubTasks(taskId: string): SubTask[] {
    const rows = this.db
      .select()
      .from(subTasks)
      .where(eq(subTasks.taskId, taskId))
      .orderBy(subTasks.sortOrder)
      .all()
    return rows.map((r) => rowToSubTask(r))
  }

  /**
   * Get the total number of tasks in the database.
   */
  // ---- Reorder Tasks ----

  reorder(items: ReorderTaskItem[]): void {
    if (items.length === 0) return

    // Use raw database for transaction if available, otherwise update one by one
    if (this.rawDb) {
      const updateStmt = this.rawDb.prepare(
        'UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ?'
      )
      const now = new Date().toISOString()
      const runAll = this.rawDb.transaction(() => {
        for (const item of items) {
          updateStmt.run(item.sortOrder, now, item.id)
        }
      })
      runAll()
    } else {
      const now = new Date().toISOString()
      for (const item of items) {
        this.db
          .update(tasks)
          .set({ sortOrder: item.sortOrder, updatedAt: now })
          .where(eq(tasks.id, item.id))
          .run()
      }
    }
  }

  count(filter?: { status?: Task['status'] }): number {
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