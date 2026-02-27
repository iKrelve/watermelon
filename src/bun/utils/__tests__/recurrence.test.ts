import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getNextOccurrence, isValidRecurrenceRule } from '../recurrence'
import type { RecurrenceRule, RecurrenceType } from '@shared/types'
import {
  addDays,
  addWeeks,
  addMonths,
  getDay,
  getDate,
  getDaysInMonth,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  isEqual,
} from 'date-fns'

// ============================================================
// Arbitraries
// ============================================================

const recurrenceTypeArb = fc.constantFrom<RecurrenceType>('daily', 'weekly', 'monthly', 'custom')

/** A valid positive interval (1–30). */
const intervalArb = fc.integer({ min: 1, max: 30 })

/** A day-of-week value (0=Sun … 6=Sat). */
const dayOfWeekArb = fc.integer({ min: 0, max: 6 })

/** A non-empty sorted array of unique day-of-week values. */
const daysOfWeekArb = fc
  .uniqueArray(dayOfWeekArb, { minLength: 1, maxLength: 7 })
  .map((arr) => arr.sort((a, b) => a - b))

/** A day-of-month value (1–31). */
const dayOfMonthArb = fc.integer({ min: 1, max: 31 })

/** A base date in a reasonable range to avoid overflow. */
const baseDateArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()))

// ============================================================
// getNextOccurrence – Daily
// ============================================================

describe('getNextOccurrence – daily', () => {
  it('returns currentDate + interval days', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, (base, interval) => {
        const rule: RecurrenceRule = { type: 'daily', interval }
        const result = getNextOccurrence(rule, base)
        const expected = addDays(base, interval)
        expect(result.getTime()).toBe(expected.getTime())
      }),
      { numRuns: 200 }
    )
  })

  it('interval=1 advances exactly one day', () => {
    const date = new Date('2025-03-15')
    const result = getNextOccurrence({ type: 'daily', interval: 1 }, date)
    expect(result).toEqual(new Date('2025-03-16'))
  })

  it('crosses month boundary correctly', () => {
    const date = new Date('2025-01-31')
    const result = getNextOccurrence({ type: 'daily', interval: 1 }, date)
    expect(result).toEqual(new Date('2025-02-01'))
  })
})

// ============================================================
// getNextOccurrence – Weekly (no daysOfWeek)
// ============================================================

describe('getNextOccurrence – weekly (simple)', () => {
  it('returns currentDate + interval weeks when daysOfWeek is absent', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, (base, interval) => {
        const rule: RecurrenceRule = { type: 'weekly', interval }
        const result = getNextOccurrence(rule, base)
        const expected = addWeeks(base, interval)
        expect(result.getTime()).toBe(expected.getTime())
      }),
      { numRuns: 200 }
    )
  })

  it('returns currentDate + interval weeks when daysOfWeek is empty', () => {
    const date = new Date('2025-06-16') // Monday
    const rule: RecurrenceRule = { type: 'weekly', interval: 2, daysOfWeek: [] }
    const result = getNextOccurrence(rule, date)
    expect(result).toEqual(addWeeks(date, 2))
  })
})

// ============================================================
// getNextOccurrence – Weekly (with daysOfWeek)
// ============================================================

describe('getNextOccurrence – weekly (with daysOfWeek)', () => {
  it('picks the next matching day in the same week when one is available', () => {
    // Monday 2025-06-16, daysOfWeek = [1(Mon), 3(Wed), 5(Fri)], interval=1
    const monday = new Date('2025-06-16') // Day 1 (Mon)
    const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] }
    const result = getNextOccurrence(rule, monday)
    // Next matching day after Monday(1) is Wednesday(3) → +2 days
    expect(result).toEqual(new Date('2025-06-18'))
  })

  it('wraps to first day of next cycle when no more days this week', () => {
    // Friday 2025-06-20, Day 5 (Fri), daysOfWeek = [1(Mon), 3(Wed), 5(Fri)], interval=1
    const friday = new Date('2025-06-20')
    const rule: RecurrenceRule = { type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] }
    const result = getNextOccurrence(rule, friday)
    // No day > 5, wrap to first day (Mon=1) of next week → Monday 2025-06-23
    expect(result).toEqual(new Date('2025-06-23'))
  })

  it('wraps correctly with interval > 1', () => {
    // Friday 2025-06-20, Day 5, daysOfWeek = [1], interval = 2
    const friday = new Date('2025-06-20')
    const rule: RecurrenceRule = { type: 'weekly', interval: 2, daysOfWeek: [1] }
    const result = getNextOccurrence(rule, friday)
    // Wrap: 7 * 2 - (5 - 1) = 14 - 4 = 10 days → 2025-06-30 (Monday)
    expect(result).toEqual(new Date('2025-06-30'))
    expect(getDay(result)).toBe(1) // Monday
  })

  it('result always falls on a day in daysOfWeek', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, daysOfWeekArb, (base, interval, daysOfWeek) => {
        const rule: RecurrenceRule = { type: 'weekly', interval, daysOfWeek }
        const result = getNextOccurrence(rule, base)
        expect(daysOfWeek).toContain(getDay(result))
      }),
      { numRuns: 300 }
    )
  })

  it('result is always strictly after currentDate', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, daysOfWeekArb, (base, interval, daysOfWeek) => {
        const rule: RecurrenceRule = { type: 'weekly', interval, daysOfWeek }
        const result = getNextOccurrence(rule, base)
        expect(isAfter(result, base)).toBe(true)
      }),
      { numRuns: 300 }
    )
  })
})

// ============================================================
// getNextOccurrence – Monthly
// ============================================================

describe('getNextOccurrence – monthly', () => {
  it('returns currentDate + interval months when dayOfMonth is absent', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, (base, interval) => {
        const rule: RecurrenceRule = { type: 'monthly', interval }
        const result = getNextOccurrence(rule, base)
        const expected = addMonths(base, interval)
        expect(result.getTime()).toBe(expected.getTime())
      }),
      { numRuns: 200 }
    )
  })

  it('clamps to last day of month when dayOfMonth exceeds month length', () => {
    // January 15 → add 1 month → February, dayOfMonth=31 → Feb 28 (2025)
    const date = new Date('2025-01-15')
    const rule: RecurrenceRule = { type: 'monthly', interval: 1, dayOfMonth: 31 }
    const result = getNextOccurrence(rule, date)
    expect(getDate(result)).toBe(28) // Feb 2025 has 28 days
  })

  it('clamps to Feb 29 in a leap year', () => {
    const date = new Date('2024-01-15')
    const rule: RecurrenceRule = { type: 'monthly', interval: 1, dayOfMonth: 31 }
    const result = getNextOccurrence(rule, date)
    expect(getDate(result)).toBe(29) // Feb 2024 has 29 days (leap year)
  })

  it('sets exact dayOfMonth when month has enough days', () => {
    const date = new Date('2025-06-15')
    const rule: RecurrenceRule = { type: 'monthly', interval: 1, dayOfMonth: 25 }
    const result = getNextOccurrence(rule, date)
    expect(getDate(result)).toBe(25)
  })

  it('clamped day is always <= getDaysInMonth(targetMonth)', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, dayOfMonthArb, (base, interval, dayOfMonth) => {
        const rule: RecurrenceRule = { type: 'monthly', interval, dayOfMonth }
        const result = getNextOccurrence(rule, base)
        const maxDay = getDaysInMonth(result)
        expect(getDate(result)).toBeLessThanOrEqual(maxDay)
      }),
      { numRuns: 300 }
    )
  })
})

// ============================================================
// getNextOccurrence – Custom
// ============================================================

describe('getNextOccurrence – custom', () => {
  it('behaves identically to daily', () => {
    fc.assert(
      fc.property(baseDateArb, intervalArb, (base, interval) => {
        const customRule: RecurrenceRule = { type: 'custom', interval }
        const dailyRule: RecurrenceRule = { type: 'daily', interval }
        const customResult = getNextOccurrence(customRule, base)
        const dailyResult = getNextOccurrence(dailyRule, base)
        expect(customResult.getTime()).toBe(dailyResult.getTime())
      }),
      { numRuns: 100 }
    )
  })
})

// ============================================================
// getNextOccurrence – default branch
// ============================================================

describe('getNextOccurrence – unknown type fallback', () => {
  it('defaults to +1 day for unknown recurrence type', () => {
    const date = new Date('2025-06-15')
    const rule = { type: 'unknown' as RecurrenceType, interval: 999 }
    const result = getNextOccurrence(rule, date)
    expect(result).toEqual(addDays(date, 1))
  })
})

// ============================================================
// isValidRecurrenceRule
// ============================================================

describe('isValidRecurrenceRule', () => {
  it('rejects interval < 1', () => {
    expect(isValidRecurrenceRule({ type: 'daily', interval: 0 })).toBe(false)
    expect(isValidRecurrenceRule({ type: 'daily', interval: -1 })).toBe(false)
  })

  it('accepts valid daily rules', () => {
    fc.assert(
      fc.property(intervalArb, (interval) => {
        expect(isValidRecurrenceRule({ type: 'daily', interval })).toBe(true)
      }),
      { numRuns: 50 }
    )
  })

  it('accepts valid custom rules', () => {
    fc.assert(
      fc.property(intervalArb, (interval) => {
        expect(isValidRecurrenceRule({ type: 'custom', interval })).toBe(true)
      }),
      { numRuns: 50 }
    )
  })

  // Weekly
  it('accepts weekly without daysOfWeek', () => {
    expect(isValidRecurrenceRule({ type: 'weekly', interval: 1 })).toBe(true)
  })

  it('accepts weekly with valid daysOfWeek', () => {
    fc.assert(
      fc.property(intervalArb, daysOfWeekArb, (interval, daysOfWeek) => {
        expect(isValidRecurrenceRule({ type: 'weekly', interval, daysOfWeek })).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('rejects weekly with empty daysOfWeek', () => {
    expect(isValidRecurrenceRule({ type: 'weekly', interval: 1, daysOfWeek: [] })).toBe(false)
  })

  it('rejects weekly with out-of-range daysOfWeek', () => {
    expect(isValidRecurrenceRule({ type: 'weekly', interval: 1, daysOfWeek: [7] })).toBe(false)
    expect(isValidRecurrenceRule({ type: 'weekly', interval: 1, daysOfWeek: [-1] })).toBe(false)
    expect(isValidRecurrenceRule({ type: 'weekly', interval: 1, daysOfWeek: [0, 3, 8] })).toBe(
      false
    )
  })

  // Monthly
  it('accepts monthly without dayOfMonth', () => {
    expect(isValidRecurrenceRule({ type: 'monthly', interval: 1 })).toBe(true)
  })

  it('accepts monthly with valid dayOfMonth (1-31)', () => {
    fc.assert(
      fc.property(intervalArb, dayOfMonthArb, (interval, dayOfMonth) => {
        expect(isValidRecurrenceRule({ type: 'monthly', interval, dayOfMonth })).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('rejects monthly with dayOfMonth < 1', () => {
    expect(isValidRecurrenceRule({ type: 'monthly', interval: 1, dayOfMonth: 0 })).toBe(false)
  })

  it('rejects monthly with dayOfMonth > 31', () => {
    expect(isValidRecurrenceRule({ type: 'monthly', interval: 1, dayOfMonth: 32 })).toBe(false)
  })

  // Unknown type
  it('rejects unknown recurrence type', () => {
    expect(isValidRecurrenceRule({ type: 'biweekly' as RecurrenceType, interval: 1 })).toBe(false)
  })
})
