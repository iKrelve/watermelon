import { sortByPriority } from '@/utils/priority'
import type { Task } from '../../../../../shared/types'

export type SortOption = 'default' | 'dueDate' | 'priority' | 'createdAt'

// Keys for i18n lookup
export const SORT_OPTION_KEYS: Record<SortOption, string> = {
  default: 'sort.default',
  dueDate: 'sort.byDueDate',
  priority: 'sort.byPriority',
  createdAt: 'sort.byCreatedAt',
}

export function applySortOption(tasks: Task[], sortOption: SortOption): Task[] {
  switch (sortOption) {
    case 'dueDate':
      return [...tasks].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
    case 'priority':
      return sortByPriority(tasks)
    case 'createdAt':
      return [...tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'default':
    default:
      return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)
  }
}
