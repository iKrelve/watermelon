import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { initTestDatabase } from '../index'
import { tasks, categories, subTasks, tags, taskTags } from '../schema'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schemaTypes from '../schema'

let db: BetterSQLite3Database<typeof schemaTypes>

beforeEach(() => {
  db = initTestDatabase()
})

// Arbitraries
const priorityArb = fc.constantFrom('none' as const, 'low' as const, 'medium' as const, 'high' as const)
const statusArb = fc.constantFrom('todo' as const, 'completed' as const)
const isoDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString().split('T')[0])
const isoDateTimeArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map((d) => d.toISOString())
const nonEmptyTitleArb = fc.stringMatching(/^[\w\s.,!?-]{1,200}$/)
  .filter((s) => s.trim().length > 0)

const recurrenceRuleArb = fc.oneof(
  fc.record({
    type: fc.constant('daily' as const),
    interval: fc.integer({ min: 1, max: 365 }),
  }),
  fc.record({
    type: fc.constant('weekly' as const),
    interval: fc.integer({ min: 1, max: 52 }),
    daysOfWeek: fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }),
  }),
  fc.record({
    type: fc.constant('monthly' as const),
    interval: fc.integer({ min: 1, max: 12 }),
    dayOfMonth: fc.integer({ min: 1, max: 31 }),
  })
)

describe('Database Round-Trip Tests', () => {
  // Feature: todo-app, Property 19: Task serialization round-trip
  it('Property 19: For any valid Task, serialize then deserialize produces an equivalent object', () => {
    fc.assert(
      fc.property(
        nonEmptyTitleArb,
        fc.option(fc.stringMatching(/^[\w\s.,!?-]{0,200}$/), { nil: undefined }),
        statusArb,
        priorityArb,
        fc.option(isoDateArb, { nil: undefined }),
        fc.option(isoDateTimeArb, { nil: undefined }),
        fc.option(recurrenceRuleArb, { nil: undefined }),
        fc.option(isoDateTimeArb, { nil: undefined }),
        (title, description, status, priority, dueDate, reminderTime, recurrenceRule, completedAt) => {
          const id = uuidv4()
          const now = new Date().toISOString()

          // Insert task
          db.insert(tasks).values({
            id,
            title,
            description: description ?? null,
            status,
            priority,
            categoryId: null,
            dueDate: dueDate ?? null,
            reminderTime: reminderTime ?? null,
            recurrenceRule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
            completedAt: completedAt ?? null,
            createdAt: now,
            updatedAt: now,
          }).run()

          // Retrieve task
          const result = db.select().from(tasks).where(eq(tasks.id, id)).get()

          expect(result).toBeDefined()
          expect(result!.id).toBe(id)
          expect(result!.title).toBe(title)
          expect(result!.description).toBe(description ?? null)
          expect(result!.status).toBe(status)
          expect(result!.priority).toBe(priority)
          expect(result!.dueDate).toBe(dueDate ?? null)
          expect(result!.reminderTime).toBe(reminderTime ?? null)
          expect(result!.completedAt).toBe(completedAt ?? null)

          // Round-trip for RecurrenceRule JSON
          if (recurrenceRule) {
            const parsed = JSON.parse(result!.recurrenceRule!)
            expect(parsed).toEqual(recurrenceRule)
          } else {
            expect(result!.recurrenceRule).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 19 (extended): SubTask round-trip
  it('Property 19 (extended): For any valid SubTask, serialize then deserialize produces an equivalent object', () => {
    fc.assert(
      fc.property(
        nonEmptyTitleArb,
        fc.boolean(),
        fc.integer({ min: 0, max: 1000 }),
        (title, completed, sortOrder) => {
          const taskId = uuidv4()
          const subTaskId = uuidv4()
          const now = new Date().toISOString()

          // Create parent task first
          db.insert(tasks).values({
            id: taskId,
            title: 'Parent Task',
            status: 'todo',
            priority: 'none',
            createdAt: now,
            updatedAt: now,
          }).run()

          // Insert sub-task
          db.insert(subTasks).values({
            id: subTaskId,
            taskId,
            title,
            completed,
            sortOrder,
            createdAt: now,
          }).run()

          // Retrieve sub-task
          const result = db.select().from(subTasks).where(eq(subTasks.id, subTaskId)).get()

          expect(result).toBeDefined()
          expect(result!.id).toBe(subTaskId)
          expect(result!.taskId).toBe(taskId)
          expect(result!.title).toBe(title)
          expect(result!.completed).toBe(completed)
          expect(result!.sortOrder).toBe(sortOrder)
        }
      ),
      { numRuns: 100 }
    )
  })
})
