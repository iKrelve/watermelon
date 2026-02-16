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
      return 'text-orange-500'
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
