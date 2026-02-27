import {
  isBefore,
  startOfDay,
  addDays,
  isAfter,
  parseISO,
  isSameDay,
} from 'date-fns'
import type { Task } from '@shared/types'

/**
 * Check if a task is overdue.
 * A task is overdue if it has a due date in the past and is not completed.
 */
export function isOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.status === 'completed') return false
  if (!task.dueDate) return false

  const dueDate = parseISO(task.dueDate)
  const todayStart = startOfDay(now)
  return isBefore(dueDate, todayStart)
}

/**
 * Check if a task is due today.
 */
export function isTaskDueToday(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate) return false
  const dueDate = parseISO(task.dueDate)
  return isSameDay(dueDate, now)
}

/**
 * Check if a task falls within the "Upcoming" window (next 7 days, inclusive of today).
 * Only returns true for incomplete tasks.
 */
export function isUpcoming(task: Task, now: Date = new Date()): boolean {
  if (task.status === 'completed') return false
  if (!task.dueDate) return false

  const dueDate = parseISO(task.dueDate)
  const todayStart = startOfDay(now)
  const weekEnd = addDays(todayStart, 7)

  return (
    (isAfter(dueDate, todayStart) || dueDate.getTime() === todayStart.getTime()) &&
    isBefore(dueDate, weekEnd)
  )
}

/**
 * Filter tasks that are due today and incomplete.
 */
export function filterToday(tasks: Task[], now: Date = new Date()): Task[] {
  return tasks.filter(
    (t) => t.status === 'todo' && isTaskDueToday(t, now)
  )
}

/**
 * Filter tasks that are upcoming (next 7 days) and incomplete.
 * Sorted by due date ascending.
 */
export function filterUpcoming(tasks: Task[], now: Date = new Date()): Task[] {
  return tasks
    .filter((t) => isUpcoming(t, now))
    .sort((a, b) => {
      if (!a.dueDate || !b.dueDate) return 0
      return a.dueDate.localeCompare(b.dueDate)
    })
}
