import { eq, and, gte, lte, sql, count as drizzleCount } from 'drizzle-orm'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from 'date-fns'
import * as schema from '../db/schema'
import { tasks } from '../db/schema'
import type { StatsSummary, DailyTrend } from '../../shared/types'

export class StatisticsService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Get statistics for a given period (day, week, month).
   */
  getStats(period: 'day' | 'week' | 'month', referenceDate: Date = new Date()): StatsSummary {
    let periodStart: Date
    let periodEnd: Date

    switch (period) {
      case 'day':
        periodStart = startOfDay(referenceDate)
        periodEnd = endOfDay(referenceDate)
        break
      case 'week':
        periodStart = startOfWeek(referenceDate, { weekStartsOn: 1 }) // Monday
        periodEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
        break
      case 'month':
        periodStart = startOfMonth(referenceDate)
        periodEnd = endOfMonth(referenceDate)
        break
    }

    const periodStartStr = periodStart.toISOString()
    const periodEndStr = periodEnd.toISOString()

    // Count completed tasks in period
    const completedResult = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'completed'),
          gte(tasks.completedAt, periodStartStr),
          lte(tasks.completedAt, periodEndStr)
        )
      )
      .get()

    // Count total tasks (created before or during the period)
    const totalResult = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(lte(tasks.createdAt, periodEndStr))
      .get()

    const completedTasks = completedResult?.count ?? 0
    const totalTasks = totalResult?.count ?? 0
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

    return {
      totalTasks,
      completedTasks,
      completionRate,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
    }
  }

  /**
   * Get daily completion and creation trends for the past N days.
   */
  getDailyTrend(days: number = 30, referenceDate: Date = new Date()): DailyTrend[] {
    const trends: DailyTrend[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(referenceDate, i)
      const dayStart = startOfDay(date).toISOString()
      const dayEnd = endOfDay(date).toISOString()
      const dateStr = format(date, 'yyyy-MM-dd')

      // Count tasks completed on this day
      const completedResult = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.status, 'completed'),
            gte(tasks.completedAt, dayStart),
            lte(tasks.completedAt, dayEnd)
          )
        )
        .get()

      // Count tasks created on this day
      const createdResult = this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tasks)
        .where(
          and(
            gte(tasks.createdAt, dayStart),
            lte(tasks.createdAt, dayEnd)
          )
        )
        .get()

      trends.push({
        date: dateStr,
        completed: completedResult?.count ?? 0,
        created: createdResult?.count ?? 0,
      })
    }

    return trends
  }
}
