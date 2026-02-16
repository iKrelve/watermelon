import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { isOverdue, isUpcoming, filterToday, filterUpcoming } from '../date-filters'
import { sortByPriority, priorityToRank } from '../priority'
import { format, addDays, subDays, startOfDay } from 'date-fns'
import type { Task, Priority } from '../../../../shared/types'

// Helper to create a minimal task
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id',
    title: 'Test',
    description: null,
    status: 'todo',
    priority: 'none',
    categoryId: null,
    dueDate: null,
    reminderTime: null,
    recurrenceRule: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const priorityArb = fc.constantFrom<Priority>('none', 'low', 'medium', 'high')

describe('Priority Property Tests', () => {
  // Feature: todo-app, Property 11: Priority sort ordering
  it('Property 11: Sorting by priority produces correct ordering (High → None)', () => {
    fc.assert(
      fc.property(
        fc.array(priorityArb, { minLength: 2, maxLength: 20 }),
        (priorities) => {
          const tasks = priorities.map((p, i) =>
            makeTask({ id: `t-${i}`, priority: p })
          )

          const sorted = sortByPriority(tasks, 'asc')

          // Each task's priority rank should be <= the next task's rank
          for (let i = 0; i < sorted.length - 1; i++) {
            const rankA = priorityToRank(sorted[i].priority)
            const rankB = priorityToRank(sorted[i + 1].priority)
            expect(rankA).toBeLessThanOrEqual(rankB)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Date Filter Property Tests', () => {
  // Feature: todo-app, Property 12: Overdue detection accuracy
  it('Property 12: Tasks with past due dates and todo status are detected as overdue', () => {
    const now = new Date('2025-06-15T12:00:00Z')

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysAgo) => {
          const pastDate = subDays(startOfDay(now), daysAgo)
          const dueDateStr = format(pastDate, 'yyyy-MM-dd')

          const todoTask = makeTask({ status: 'todo', dueDate: dueDateStr })
          expect(isOverdue(todoTask, now)).toBe(true)

          // Completed tasks with past due dates are NOT overdue
          const completedTask = makeTask({
            status: 'completed',
            dueDate: dueDateStr,
            completedAt: now.toISOString(),
          })
          expect(isOverdue(completedTask, now)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 12 (extended): Tasks with future due dates are NOT overdue', () => {
    const now = new Date('2025-06-15T12:00:00Z')

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysAhead) => {
          const futureDate = addDays(startOfDay(now), daysAhead)
          const dueDateStr = format(futureDate, 'yyyy-MM-dd')

          const task = makeTask({ status: 'todo', dueDate: dueDateStr })
          expect(isOverdue(task, now)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: todo-app, Property 13: Today and Upcoming filter correctness
  it('Property 13: Today filter returns exactly incomplete tasks due today', () => {
    const now = new Date('2025-06-15T12:00:00Z')
    const todayStr = format(startOfDay(now), 'yyyy-MM-dd')

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 5 }),
        (todayCount, otherCount) => {
          const allTasks: Task[] = []

          // Tasks due today
          for (let i = 0; i < todayCount; i++) {
            allTasks.push(makeTask({
              id: `today-${i}`,
              status: 'todo',
              dueDate: todayStr,
            }))
          }

          // Tasks due other days
          for (let i = 0; i < otherCount; i++) {
            const otherDate = addDays(startOfDay(now), i + 1)
            allTasks.push(makeTask({
              id: `other-${i}`,
              status: 'todo',
              dueDate: format(otherDate, 'yyyy-MM-dd'),
            }))
          }

          const todayTasks = filterToday(allTasks, now)
          expect(todayTasks.length).toBe(todayCount)
          expect(todayTasks.every((t) => t.dueDate === todayStr)).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 13 (extended): Upcoming filter returns incomplete tasks within 7 days, sorted by date', () => {
    const now = new Date('2025-06-15T12:00:00Z')

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 14 }), { minLength: 1, maxLength: 10 }),
        (dayOffsets) => {
          const allTasks = dayOffsets.map((offset, i) =>
            makeTask({
              id: `task-${i}`,
              status: 'todo',
              dueDate: format(addDays(startOfDay(now), offset), 'yyyy-MM-dd'),
            })
          )

          const upcoming = filterUpcoming(allTasks, now)

          // All returned tasks should be within 7 days
          for (const task of upcoming) {
            const daysDiff = dayOffsets[parseInt(task.id.split('-')[1])]
            expect(daysDiff).toBeGreaterThanOrEqual(0)
            expect(daysDiff).toBeLessThan(7)
          }

          // Should be sorted by due date ascending
          for (let i = 0; i < upcoming.length - 1; i++) {
            expect(upcoming[i].dueDate!.localeCompare(upcoming[i + 1].dueDate!)).toBeLessThanOrEqual(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
