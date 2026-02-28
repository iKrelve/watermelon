import type { Priority, Task } from '@shared/types'
import i18n from '@/i18n'

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
 * Get text color class for a priority level.
 * Uses semantic CSS variable-backed Tailwind classes.
 */
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'text-priority-high'
    case 'medium':
      return 'text-priority-medium'
    case 'low':
      return 'text-priority-low'
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
      return i18n.t('priority.high')
    case 'medium':
      return i18n.t('priority.medium')
    case 'low':
      return i18n.t('priority.low')
    case 'none':
    default:
      return i18n.t('priority.none')
  }
}

/**
 * Get badge classes with colored background for a priority level.
 * Uses semantic CSS variable-backed Tailwind classes for both light and dark mode.
 */
export function getPriorityBadgeClasses(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'bg-priority-high/15 text-priority-high'
    case 'medium':
      return 'bg-priority-medium/15 text-priority-medium'
    case 'low':
      return 'bg-priority-low/15 text-priority-low'
    case 'none':
    default:
      return ''
  }
}

/**
 * Get stripe (left border bar) background color class for a priority level.
 * Uses semantic CSS variable-backed Tailwind classes.
 */
export function getPriorityStripeColor(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'bg-priority-high'
    case 'medium':
      return 'bg-priority-medium'
    case 'low':
      return 'bg-priority-low'
    case 'none':
    default:
      return ''
  }
}

/**
 * Get border color class for priority checkbox.
 */
export function getPriorityCheckboxClasses(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'border-priority-high data-[state=checked]:bg-priority-high data-[state=checked]:border-priority-high'
    case 'medium':
      return 'border-priority-medium data-[state=checked]:bg-priority-medium data-[state=checked]:border-priority-medium'
    case 'low':
      return 'border-priority-low data-[state=checked]:bg-priority-low data-[state=checked]:border-priority-low'
    case 'none':
    default:
      return ''
  }
}

/**
 * Get background color class for priority dot indicator.
 */
export function getPriorityDotColor(priority: Priority): string {
  switch (priority) {
    case 'high':
      return 'bg-priority-high'
    case 'medium':
      return 'bg-priority-medium'
    case 'low':
      return 'bg-priority-low'
    case 'none':
    default:
      return ''
  }
}
