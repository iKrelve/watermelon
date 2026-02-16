import type { Priority, Task } from '../../../shared/types'

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
}

/**
 * Convert a priority to its numeric rank (lower = higher priority).
 */
export function priorityToRank(priority: Priority): number {
  return PRIORITY_RANK[priority] ?? 3
}

/**
 * Sort tasks by priority (High → None).
 * Returns a new sorted array.
 */
export function sortByPriority(tasks: Task[], order: 'asc' | 'desc' = 'asc'): Task[] {
  return [...tasks].sort((a, b) => {
    const rankA = priorityToRank(a.priority)
    const rankB = priorityToRank(b.priority)
    return order === 'asc' ? rankA - rankB : rankB - rankA
  })
}

/**
 * Get color class for a priority level.
 */
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'text-red-500'
    case 'medium':
      return 'text-amber-500'
    case 'low':
      return 'text-blue-500'
    case 'none':
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get display label for a priority.
 */
export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
    case 'none':
    default:
      return '无'
  }
}

/**
 * Get badge classes with colored background for a priority level.
 * Returns Tailwind classes for both light and dark mode.
 */
export function getPriorityBadgeClasses(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'low':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'none':
    default:
      return ''
  }
}

/**
 * Get stripe (left border bar) background color class for a priority level.
 */
export function getPriorityStripeColor(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500'
    case 'medium':
      return 'bg-amber-500'
    case 'low':
      return 'bg-blue-500'
    case 'none':
    default:
      return ''
  }
}
