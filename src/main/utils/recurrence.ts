import { addDays, addWeeks, addMonths, setDate, getDaysInMonth, getDay } from 'date-fns'
import type { RecurrenceRule } from '../../shared/types'

/**
 * Calculate the next occurrence date based on a recurrence rule and the current date.
 *
 * Handles:
 * - Daily: adds `interval` days
 * - Weekly: adds `interval` weeks, optionally snapping to next matching day of week
 * - Monthly: adds `interval` months, clamping to valid day (e.g., Feb 30 → Feb 28/29)
 * - Custom: treated as daily with `interval` days
 */
export function getNextOccurrence(rule: RecurrenceRule, currentDate: Date): Date {
  switch (rule.type) {
    case 'daily':
      return addDays(currentDate, rule.interval)

    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return getNextWeeklyOccurrence(currentDate, rule.interval, rule.daysOfWeek)
      }
      return addWeeks(currentDate, rule.interval)

    case 'monthly':
      return getNextMonthlyOccurrence(currentDate, rule.interval, rule.dayOfMonth)

    case 'custom':
      return addDays(currentDate, rule.interval)

    default:
      return addDays(currentDate, 1)
  }
}

/**
 * For weekly recurrence with specific days of week.
 * Finds the next matching day after the current date.
 * If no more matching days in the current week cycle, jumps to the next cycle.
 */
function getNextWeeklyOccurrence(
  currentDate: Date,
  interval: number,
  daysOfWeek: number[]
): Date {
  const sorted = [...daysOfWeek].sort((a, b) => a - b)
  const currentDay = getDay(currentDate) // 0=Sunday

  // Try to find next day in current week that's after current day
  for (const day of sorted) {
    if (day > currentDay) {
      return addDays(currentDate, day - currentDay)
    }
  }

  // No more days this week cycle, go to first day in next cycle
  const firstDay = sorted[0]
  const daysUntilNextWeek = 7 * interval - (currentDay - firstDay)
  return addDays(currentDate, daysUntilNextWeek)
}

/**
 * For monthly recurrence.
 * Adds `interval` months and clamps to a valid day of the target month.
 * E.g., dayOfMonth=31 in February → Feb 28/29
 */
function getNextMonthlyOccurrence(
  currentDate: Date,
  interval: number,
  dayOfMonth?: number
): Date {
  const nextMonth = addMonths(currentDate, interval)

  if (dayOfMonth) {
    const maxDay = getDaysInMonth(nextMonth)
    const clampedDay = Math.min(dayOfMonth, maxDay)
    return setDate(nextMonth, clampedDay)
  }

  return nextMonth
}

/**
 * Validate a recurrence rule.
 * Returns true if the rule is valid.
 */
export function isValidRecurrenceRule(rule: RecurrenceRule): boolean {
  if (rule.interval < 1) return false

  switch (rule.type) {
    case 'daily':
    case 'custom':
      return true

    case 'weekly':
      if (rule.daysOfWeek) {
        return (
          rule.daysOfWeek.length > 0 &&
          rule.daysOfWeek.every((d) => d >= 0 && d <= 6)
        )
      }
      return true

    case 'monthly':
      if (rule.dayOfMonth !== undefined) {
        return rule.dayOfMonth >= 1 && rule.dayOfMonth <= 31
      }
      return true

    default:
      return false
  }
}
