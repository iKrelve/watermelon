import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getNextOccurrence } from '../recurrence'
import { getDaysInMonth } from 'date-fns'
import type { RecurrenceRule } from '../../../shared/types'

describe('Recurrence Rule Property Tests', () => {
  // Feature: todo-app, Property 15: Invalid recurrence date adjustment
  it('Property 15: Monthly recurrence with dayOfMonth > 28 clamps to valid day', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 29, max: 31 }),
        fc.integer({ min: 1, max: 3 }),
        // Use dates that will roll over to months with fewer days
        fc.constantFrom(
          new Date('2024-01-15'), // Jan → Feb (28/29)
          new Date('2024-03-15'), // Mar → Apr (30)
          new Date('2025-01-15'), // Jan → Feb (28, non-leap)
          new Date('2024-07-15'), // Jul → Aug (31)
          new Date('2024-10-15'), // Oct → Nov (30)
        ),
        (dayOfMonth, interval, startDate) => {
          const rule: RecurrenceRule = {
            type: 'monthly',
            interval,
            dayOfMonth,
          }

          const nextDate = getNextOccurrence(rule, startDate)
          const maxDaysInMonth = getDaysInMonth(nextDate)

          // The day should never exceed the max days in the target month
          expect(nextDate.getDate()).toBeLessThanOrEqual(maxDaysInMonth)

          // The day should be the minimum of dayOfMonth and maxDaysInMonth
          expect(nextDate.getDate()).toBe(Math.min(dayOfMonth, maxDaysInMonth))
        }
      ),
      { numRuns: 100 }
    )
  })

  // Daily recurrence always advances
  it('Daily recurrence always produces a future date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter((d) => !isNaN(d.getTime())),
        (interval, startDate) => {
          const rule: RecurrenceRule = { type: 'daily', interval }
          const nextDate = getNextOccurrence(rule, startDate)
          expect(nextDate.getTime()).toBeGreaterThan(startDate.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  // Weekly recurrence always advances
  it('Weekly recurrence always produces a future date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 52 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).filter((d) => !isNaN(d.getTime())),
        (interval, startDate) => {
          const rule: RecurrenceRule = { type: 'weekly', interval }
          const nextDate = getNextOccurrence(rule, startDate)
          expect(nextDate.getTime()).toBeGreaterThan(startDate.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })
})
