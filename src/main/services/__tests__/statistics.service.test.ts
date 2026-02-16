import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { StatisticsService } from '../statistics.service'
import { TaskService } from '../task.service'
import { initTestDatabase } from '../../db'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../../db/schema'

let db: BetterSQLite3Database<typeof schema>
let statisticsService: StatisticsService
let taskService: TaskService

beforeEach(() => {
  db = initTestDatabase()
  statisticsService = new StatisticsService(db)
  taskService = new TaskService(db)
})

describe('StatisticsService Property Tests', () => {
  // Feature: todo-app, Property 18: Statistics accuracy
  it('Property 18: Completed task count matches actual completions in period', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 5 }),
        (completedCount, pendingCount) => {
          const freshDb = initTestDatabase()
          const freshStatsService = new StatisticsService(freshDb)
          const freshTaskService = new TaskService(freshDb)

          // Create and complete tasks
          for (let i = 0; i < completedCount; i++) {
            const task = freshTaskService.create({ title: `Completed ${i}` })
            freshTaskService.complete(task.id)
          }

          // Create pending tasks
          for (let i = 0; i < pendingCount; i++) {
            freshTaskService.create({ title: `Pending ${i}` })
          }

          const stats = freshStatsService.getStats('day')

          expect(stats.completedTasks).toBe(completedCount)
          expect(stats.totalTasks).toBe(completedCount + pendingCount)

          // Completion rate
          const expectedRate =
            stats.totalTasks > 0 ? completedCount / (completedCount + pendingCount) : 0
          expect(stats.completionRate).toBeCloseTo(expectedRate, 5)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Statistics returns zero for empty database
  it('Returns zero stats for empty database', () => {
    const stats = statisticsService.getStats('day')
    expect(stats.completedTasks).toBe(0)
    expect(stats.totalTasks).toBe(0)
    expect(stats.completionRate).toBe(0)
  })

  // Daily trend matches individual day counts
  it('Daily trend has correct number of entries', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 30 }), (days) => {
        const trend = statisticsService.getDailyTrend(days)
        expect(trend.length).toBe(days)

        // Dates should be in ascending order
        for (let i = 0; i < trend.length - 1; i++) {
          expect(trend[i].date.localeCompare(trend[i + 1].date)).toBeLessThan(0)
        }
      }),
      { numRuns: 30 }
    )
  })
})
