import { describe, it, expect, beforeEach } from 'vitest'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { initTestDatabase } from '../../db/index'
import * as schema from '../../db/schema'
import { categories } from '../../db/schema'
import { TaskService } from '../task.service'
import { AppException } from '@shared/types'
import type { CreateTaskInput, RecurrenceRule, Task } from '@shared/types'

let db: BunSQLiteDatabase<typeof schema>
let service: TaskService

beforeEach(() => {
  db = initTestDatabase()
  service = new TaskService(db)
})

// ============================================================
// Helpers
// ============================================================

function createMinimalTask(overrides: Partial<CreateTaskInput> = {}): Task {
  return service.create({ title: 'Test Task', ...overrides })
}

// ============================================================
// create()
// ============================================================

describe('TaskService.create', () => {
  it('creates a task with defaults', () => {
    const task = createMinimalTask()
    expect(task.id).toBeDefined()
    expect(task.title).toBe('Test Task')
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('none')
    expect(task.categoryId).toBeNull()
    expect(task.dueDate).toBeNull()
    expect(task.completedAt).toBeNull()
    expect(task.recurrenceRule).toBeNull()
    expect(task.createdAt).toBeDefined()
    expect(task.updatedAt).toBeDefined()
  })

  it('trims whitespace from title', () => {
    const task = service.create({ title: '  Hello World  ' })
    expect(task.title).toBe('Hello World')
  })

  it('rejects empty title', () => {
    expect(() => service.create({ title: '' })).toThrow(AppException)
    expect(() => service.create({ title: '   ' })).toThrow(AppException)
  })

  it('assigns decreasing sort order for new tasks (prepend)', () => {
    const first = createMinimalTask()
    const second = createMinimalTask()
    const third = createMinimalTask()
    // Each successive task should have a smaller sortOrder
    expect(second.sortOrder).toBeLessThan(first.sortOrder)
    expect(third.sortOrder).toBeLessThan(second.sortOrder)
  })

  it('stores recurrence rule as JSON', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 3 }
    const task = service.create({ title: 'Recurring', recurrenceRule: rule })
    expect(task.recurrenceRule).toEqual(rule)
  })

  it('stores all optional fields correctly', () => {
    // First create a category to reference
    db.insert(categories)
      .values({
        id: 'cat-1',
        name: 'Work',
        color: '#ff0000',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      })
      .run()

    const task = service.create({
      title: 'Full task',
      description: 'A description',
      priority: 'high',
      categoryId: 'cat-1',
      dueDate: '2025-12-31',
      reminderTime: '2025-12-31T09:00:00Z',
    })

    expect(task.description).toBe('A description')
    expect(task.priority).toBe('high')
    expect(task.categoryId).toBe('cat-1')
    expect(task.dueDate).toBe('2025-12-31')
    expect(task.reminderTime).toBe('2025-12-31T09:00:00Z')
  })
})

// ============================================================
// getById()
// ============================================================

describe('TaskService.getById', () => {
  it('returns null for non-existent ID', () => {
    expect(service.getById('non-existent')).toBeNull()
  })

  it('returns task with sub-tasks and tags', () => {
    const task = createMinimalTask()
    const retrieved = service.getById(task.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.id).toBe(task.id)
    expect(retrieved!.subTasks).toEqual([])
    expect(retrieved!.tags).toEqual([])
  })
})

// ============================================================
// getAll()
// ============================================================

describe('TaskService.getAll', () => {
  it('returns empty array when no tasks exist', () => {
    expect(service.getAll()).toEqual([])
  })

  it('returns all tasks with sub-tasks and tags', () => {
    createMinimalTask({ title: 'Task 1' })
    createMinimalTask({ title: 'Task 2' })
    const all = service.getAll()
    expect(all).toHaveLength(2)
    all.forEach((t) => {
      expect(t.subTasks).toBeDefined()
      expect(t.tags).toBeDefined()
    })
  })

  it('filters by status', () => {
    const task = createMinimalTask()
    service.complete(task.id)
    createMinimalTask({ title: 'Still todo' })

    const todos = service.getAll({ status: 'todo' })
    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe('Still todo')

    const completed = service.getAll({ status: 'completed' })
    expect(completed).toHaveLength(1)
    expect(completed[0].status).toBe('completed')
  })
})

// ============================================================
// update()
// ============================================================

describe('TaskService.update', () => {
  it('throws NOT_FOUND for non-existent task', () => {
    expect(() => service.update('non-existent', { title: 'x' })).toThrow(AppException)
  })

  it('updates title and trims whitespace', () => {
    const task = createMinimalTask()
    const updated = service.update(task.id, { title: '  Updated  ' })
    expect(updated.title).toBe('Updated')
  })

  it('rejects empty title on update', () => {
    const task = createMinimalTask()
    expect(() => service.update(task.id, { title: '' })).toThrow(AppException)
  })

  it('updates multiple fields', () => {
    const task = createMinimalTask()
    const updated = service.update(task.id, {
      priority: 'high',
      dueDate: '2025-12-25',
      description: 'Updated desc',
    })
    expect(updated.priority).toBe('high')
    expect(updated.dueDate).toBe('2025-12-25')
    expect(updated.description).toBe('Updated desc')
  })

  it('can set nullable fields to null', () => {
    const task = service.create({
      title: 'With desc',
      description: 'Some description',
      dueDate: '2025-12-25',
    })
    const updated = service.update(task.id, { description: null, dueDate: null })
    expect(updated.description).toBeNull()
    expect(updated.dueDate).toBeNull()
  })

  it('bumps updatedAt timestamp', () => {
    const task = createMinimalTask()
    // Small delay to ensure different timestamp
    const updated = service.update(task.id, { title: 'New title' })
    expect(updated.updatedAt >= task.updatedAt).toBe(true)
  })
})

// ============================================================
// delete()
// ============================================================

describe('TaskService.delete', () => {
  it('removes the task', () => {
    const task = createMinimalTask()
    service.delete(task.id)
    expect(service.getById(task.id)).toBeNull()
  })

  it('cascade-deletes sub-tasks', () => {
    const task = createMinimalTask()
    service.createSubTask(task.id, { title: 'Sub 1' })
    service.createSubTask(task.id, { title: 'Sub 2' })
    expect(service.getSubTasks(task.id)).toHaveLength(2)

    service.delete(task.id)
    expect(service.getSubTasks(task.id)).toHaveLength(0)
  })

  it('silently does nothing for non-existent ID', () => {
    expect(() => service.delete('non-existent')).not.toThrow()
  })
})

// ============================================================
// complete() — core focus
// ============================================================

describe('TaskService.complete', () => {
  it('throws NOT_FOUND for non-existent task', () => {
    expect(() => service.complete('non-existent')).toThrow(AppException)
    try {
      service.complete('non-existent')
    } catch (e) {
      expect((e as AppException).code).toBe('NOT_FOUND')
    }
  })

  it('marks a simple task as completed', () => {
    const task = createMinimalTask()
    const { completedTask, nextTask } = service.complete(task.id)

    expect(completedTask.status).toBe('completed')
    expect(completedTask.completedAt).toBeDefined()
    expect(nextTask).toBeUndefined()
  })

  it('completedTask has correct id and title', () => {
    const task = createMinimalTask({ title: 'Buy milk' })
    const { completedTask } = service.complete(task.id)
    expect(completedTask.id).toBe(task.id)
    expect(completedTask.title).toBe('Buy milk')
  })

  it('persists completed status in database', () => {
    const task = createMinimalTask()
    service.complete(task.id)
    const reloaded = service.getById(task.id)
    expect(reloaded!.status).toBe('completed')
    expect(reloaded!.completedAt).toBeDefined()
  })

  // ---- Recurring task tests ----

  it('creates next instance for a daily recurring task', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 1 }
    const task = service.create({
      title: 'Daily standup',
      dueDate: '2025-06-15',
      recurrenceRule: rule,
    })

    const { completedTask, nextTask } = service.complete(task.id)

    expect(completedTask.status).toBe('completed')
    expect(nextTask).toBeDefined()
    expect(nextTask!.title).toBe('Daily standup')
    expect(nextTask!.status).toBe('todo')
    expect(nextTask!.dueDate).toBe('2025-06-16')
    expect(nextTask!.recurrenceRule).toEqual(rule)
    // Next task should be a different entity
    expect(nextTask!.id).not.toBe(task.id)
  })

  it('creates next instance for a weekly recurring task', () => {
    const rule: RecurrenceRule = { type: 'weekly', interval: 2 }
    const task = service.create({
      title: 'Biweekly review',
      dueDate: '2025-06-15',
      recurrenceRule: rule,
    })

    const { nextTask } = service.complete(task.id)
    expect(nextTask).toBeDefined()
    expect(nextTask!.dueDate).toBe('2025-06-29') // +14 days
  })

  it('creates next instance for a monthly recurring task', () => {
    const rule: RecurrenceRule = { type: 'monthly', interval: 1, dayOfMonth: 15 }
    const task = service.create({
      title: 'Monthly report',
      dueDate: '2025-06-15',
      recurrenceRule: rule,
    })

    const { nextTask } = service.complete(task.id)
    expect(nextTask).toBeDefined()
    expect(nextTask!.dueDate).toBe('2025-07-15')
  })

  it('inherits properties from original task', () => {
    db.insert(categories)
      .values({
        id: 'cat-work',
        name: 'Work',
        color: '#0000ff',
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      })
      .run()

    const rule: RecurrenceRule = { type: 'daily', interval: 1 }
    const task = service.create({
      title: 'Recurring task',
      description: 'Important notes',
      priority: 'high',
      categoryId: 'cat-work',
      dueDate: '2025-06-15',
      recurrenceRule: rule,
    })

    const { nextTask } = service.complete(task.id)
    expect(nextTask!.description).toBe('Important notes')
    expect(nextTask!.priority).toBe('high')
    expect(nextTask!.categoryId).toBe('cat-work')
  })

  it('does NOT create next instance when endDate is exceeded', () => {
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      endDate: '2025-06-16', // End date is tomorrow
    }
    const task = service.create({
      title: 'Limited recurrence',
      dueDate: '2025-06-16', // Due on end date
      recurrenceRule: rule,
    })

    const { completedTask, nextTask } = service.complete(task.id)
    expect(completedTask.status).toBe('completed')
    // Next occurrence would be 2025-06-17 which exceeds endDate 2025-06-16
    expect(nextTask).toBeUndefined()
  })

  it('creates next instance when endDate is not yet exceeded', () => {
    const rule: RecurrenceRule = {
      type: 'daily',
      interval: 1,
      endDate: '2025-12-31',
    }
    const task = service.create({
      title: 'Long recurrence',
      dueDate: '2025-06-15',
      recurrenceRule: rule,
    })

    const { nextTask } = service.complete(task.id)
    expect(nextTask).toBeDefined()
    expect(nextTask!.dueDate).toBe('2025-06-16')
  })

  it('uses current date when original task has no dueDate', () => {
    const rule: RecurrenceRule = { type: 'daily', interval: 3 }
    const task = service.create({
      title: 'No due date recurring',
      recurrenceRule: rule,
    })

    const { nextTask } = service.complete(task.id)
    expect(nextTask).toBeDefined()
    // The dueDate should be ~3 days from now
    const nextDue = new Date(nextTask!.dueDate!)
    const now = new Date()
    const diffDays = Math.round(
      (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    // Allow a tolerance of ±1 day for timing
    expect(diffDays).toBeGreaterThanOrEqual(2)
    expect(diffDays).toBeLessThanOrEqual(4)
  })
})

// ============================================================
// Sub-Task CRUD
// ============================================================

describe('TaskService – Sub-tasks', () => {
  it('creates a sub-task linked to parent', () => {
    const task = createMinimalTask()
    const sub = service.createSubTask(task.id, { title: 'Sub item' })
    expect(sub.taskId).toBe(task.id)
    expect(sub.title).toBe('Sub item')
    expect(sub.completed).toBe(false)
  })

  it('rejects sub-task for non-existent parent', () => {
    expect(() => service.createSubTask('no-parent', { title: 'orphan' })).toThrow(AppException)
  })

  it('rejects sub-task with empty title', () => {
    const task = createMinimalTask()
    expect(() => service.createSubTask(task.id, { title: '' })).toThrow(AppException)
  })

  it('assigns incrementing sort orders', () => {
    const task = createMinimalTask()
    const s1 = service.createSubTask(task.id, { title: 'First' })
    const s2 = service.createSubTask(task.id, { title: 'Second' })
    expect(s2.sortOrder).toBeGreaterThan(s1.sortOrder)
  })

  it('updates a sub-task', () => {
    const task = createMinimalTask()
    const sub = service.createSubTask(task.id, { title: 'Original' })
    const updated = service.updateSubTask(sub.id, { title: 'Revised', completed: true })
    expect(updated.title).toBe('Revised')
    expect(updated.completed).toBe(true)
  })

  it('deletes a sub-task', () => {
    const task = createMinimalTask()
    const sub = service.createSubTask(task.id, { title: 'To delete' })
    service.deleteSubTask(sub.id)
    const subs = service.getSubTasks(task.id)
    expect(subs).toHaveLength(0)
  })
})

// ============================================================
// reorder()
// ============================================================

describe('TaskService.reorder', () => {
  it('updates sort orders for multiple tasks', () => {
    const t1 = createMinimalTask({ title: 'A' })
    const t2 = createMinimalTask({ title: 'B' })
    const t3 = createMinimalTask({ title: 'C' })

    service.reorder([
      { id: t1.id, sortOrder: 3 },
      { id: t2.id, sortOrder: 1 },
      { id: t3.id, sortOrder: 2 },
    ])

    const reloaded1 = service.getById(t1.id)!
    const reloaded2 = service.getById(t2.id)!
    const reloaded3 = service.getById(t3.id)!
    expect(reloaded1.sortOrder).toBe(3)
    expect(reloaded2.sortOrder).toBe(1)
    expect(reloaded3.sortOrder).toBe(2)
  })

  it('no-op for empty items', () => {
    expect(() => service.reorder([])).not.toThrow()
  })
})

// ============================================================
// count()
// ============================================================

describe('TaskService.count', () => {
  it('returns 0 for empty database', () => {
    expect(service.count()).toBe(0)
  })

  it('counts all tasks', () => {
    createMinimalTask()
    createMinimalTask()
    expect(service.count()).toBe(2)
  })

  it('counts by status', () => {
    const task = createMinimalTask()
    createMinimalTask()
    service.complete(task.id)

    expect(service.count({ status: 'todo' })).toBe(1)
    expect(service.count({ status: 'completed' })).toBe(1)
  })
})
