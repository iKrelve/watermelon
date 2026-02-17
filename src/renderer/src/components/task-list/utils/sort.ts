import { sortByPriority } from '@/utils/priority'
import type { Task } from '../../../../../shared/types'

export type SortOption = 'default' | 'dueDate' | 'priority' | 'createdAt'

export const SORT_LABELS: Record<SortOption, string> = {
  default: '默认',
  dueDate: '按截止日期',
  priority: '按优先级',
  createdAt: '按创建时间',
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
