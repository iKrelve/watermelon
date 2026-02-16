import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { TaskService } from '../task.service'
import { initTestDatabase } from '../../db/index'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../../db/schema'

let db: BetterSQLite3Database<typeof schema>
let taskService: TaskService

beforeEach(() => {
  db = initTestDatabase()
  taskService = new TaskService(db)
})

// Arbitraries
const validTitleArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0)

const whitespaceOnlyArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n'),
  fc.constant('  \t  \n  '),
  fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 20 }).map((a) => a.join(''))
)

const priorityArb = fc.constantFrom(
  'none' as const,
  'low' as const,
  'medium' as const,
  'high' as const
)

describe('TaskService CRUD Property Tests', () => {
  // Feature: todo-app, Property 1: Valid task creation grows the task list
  it('Property 1: For any non-empty title, creating a task grows the list by one', () => {
    fc.assert(
      fc.property(validTitleArb, (title) => {
        const countBefore = taskService.count()
        const task = taskService.create({ title })
        const countAfter = taskService.count()

        expect(countAfter).toBe(countBefore + 1)
        expect(task.title).toBe(title.trim())
        expect(task.status).toBe('todo')
        expect(task.id).toBeTruthy()
      }),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 2: Whitespace-only input rejection
  it('Property 2: For any whitespace-only string, task creation is rejected', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (title) => {
        const countBefore = taskService.count()
        expect(() => taskService.create({ title })).toThrow('VALIDATION_ERROR')
        const countAfter = taskService.count()
        expect(countAfter).toBe(countBefore)
      }),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 3: Task edit persistence (round-trip)
  it('Property 3: For any task and valid edits, updating then retrieving returns updated values', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        validTitleArb,
        fc.option(fc.string({ maxLength: 300 }), { nil: undefined }),
        priorityArb,
        fc.option(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
            .filter((d) => !isNaN(d.getTime()))
            .map((d) => d.toISOString().split('T')[0]),
          { nil: undefined }
        ),
        (originalTitle, newTitle, newDescription, newPriority, newDueDate) => {
          const task = taskService.create({ title: originalTitle })

          const updated = taskService.update(task.id, {
            title: newTitle,
            description: newDescription ?? null,
            priority: newPriority,
            dueDate: newDueDate ?? null,
          })

          expect(updated.title).toBe(newTitle.trim())
          expect(updated.description).toBe(newDescription ?? null)
          expect(updated.priority).toBe(newPriority)
          expect(updated.dueDate).toBe(newDueDate ?? null)

          // Double-check by retrieving again
          const retrieved = taskService.getById(task.id)
          expect(retrieved).toBeDefined()
          expect(retrieved!.title).toBe(newTitle.trim())
          expect(retrieved!.priority).toBe(newPriority)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 4: Task deletion cascades to sub-tasks
  it('Property 4: For any task with sub-tasks, deletion removes both task and sub-tasks', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        fc.integer({ min: 0, max: 5 }),
        (title, subTaskCount) => {
          const task = taskService.create({ title })

          // Add sub-tasks
          for (let i = 0; i < subTaskCount; i++) {
            taskService.createSubTask(task.id, { title: `Sub ${i}` })
          }

          // Verify sub-tasks were created
          const subsBefore = taskService.getSubTasks(task.id)
          expect(subsBefore.length).toBe(subTaskCount)

          // Delete the task
          taskService.delete(task.id)

          // Task should be gone
          expect(taskService.getById(task.id)).toBeNull()

          // Sub-tasks should also be gone
          const subsAfter = taskService.getSubTasks(task.id)
          expect(subsAfter.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('TaskService Completion Property Tests', () => {
  // Feature: todo-app, Property 5: Completion sets status and timestamp
  it('Property 5: For any todo task, completing it sets status to completed with a valid timestamp', () => {
    fc.assert(
      fc.property(validTitleArb, (title) => {
        const task = taskService.create({ title })
        expect(task.status).toBe('todo')
        expect(task.completedAt).toBeNull()

        const before = new Date()
        const { completedTask } = taskService.complete(task.id)
        const after = new Date()

        expect(completedTask.status).toBe('completed')
        expect(completedTask.completedAt).toBeTruthy()

        const completedAt = new Date(completedTask.completedAt!)
        expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
        expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
      }),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 14: Recurring task next-occurrence generation
  it('Property 14: For any recurring task, completing it creates a new todo with the next due date', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        fc.constantFrom('daily' as const, 'weekly' as const, 'monthly' as const),
        fc.integer({ min: 1, max: 10 }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
          .filter((d) => !isNaN(d.getTime()))
          .map((d) => d.toISOString().split('T')[0]),
        (title, type, interval, dueDate) => {
          const recurrenceRule = { type, interval }
          const task = taskService.create({
            title,
            dueDate,
            recurrenceRule,
          })

          const { completedTask, nextTask } = taskService.complete(task.id)

          // Original task should be completed
          expect(completedTask.status).toBe('completed')

          // New task should exist
          expect(nextTask).toBeDefined()
          expect(nextTask!.status).toBe('todo')
          expect(nextTask!.title).toBe(title.trim())
          expect(nextTask!.dueDate).toBeTruthy()

          // Next due date should be after the original
          const originalDate = new Date(dueDate)
          const nextDate = new Date(nextTask!.dueDate!)
          expect(nextDate.getTime()).toBeGreaterThan(originalDate.getTime())

          // Recurrence rule should be preserved
          expect(nextTask!.recurrenceRule).toEqual(recurrenceRule)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('SubTask Property Tests', () => {
  // Feature: todo-app, Property 2 (sub-tasks): Whitespace sub-task title rejection
  it('Property 2 (sub-tasks): For any whitespace-only string, sub-task creation is rejected', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (subTitle) => {
        const task = taskService.create({ title: 'Parent Task' })
        const subsBefore = taskService.getSubTasks(task.id)

        expect(() => taskService.createSubTask(task.id, { title: subTitle })).toThrow(
          'VALIDATION_ERROR'
        )

        const subsAfter = taskService.getSubTasks(task.id)
        expect(subsAfter.length).toBe(subsBefore.length)
      }),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 6: Sub-task completion toggle is idempotent
  it('Property 6: For any sub-task, toggling completed twice returns to original state', () => {
    fc.assert(
      fc.property(validTitleArb, (subTitle) => {
        const task = taskService.create({ title: 'Parent' })
        const sub = taskService.createSubTask(task.id, { title: subTitle })
        const original = sub.completed

        // Toggle once
        const toggled1 = taskService.updateSubTask(sub.id, { completed: !original })
        expect(toggled1.completed).toBe(!original)

        // Toggle twice
        const toggled2 = taskService.updateSubTask(sub.id, { completed: original })
        expect(toggled2.completed).toBe(original)
      }),
      { numRuns: 100 }
    )
  })
})
