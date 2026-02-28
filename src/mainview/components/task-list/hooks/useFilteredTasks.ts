import { useMemo } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useTasksQuery } from '@/hooks/useDataQueries'
import { filterToday, filterUpcoming } from '@/utils/date-filters'
import type { Task } from '@shared/types'

export function useFilteredTasks(): Task[] {
  const filterView = useUIStore((s) => s.filterView)
  const filterCategoryId = useUIStore((s) => s.filterCategoryId)
  const filterTagIds = useUIStore((s) => s.filterTagIds)
  const searchQuery = useUIStore((s) => s.searchQuery)
  const { data: tasks = [] } = useTasksQuery()

  return useMemo(() => {
    let filtered: Task[]

    switch (filterView) {
      case 'all':
        filtered = tasks.filter((t) => t.status === 'todo')
        break
      case 'today':
        filtered = filterToday(tasks)
        break
      case 'upcoming':
        filtered = filterUpcoming(tasks)
        break
      case 'completed':
        filtered = tasks.filter((t) => t.status === 'completed')
        break
      case 'category':
        filtered = tasks.filter(
          (t) => t.categoryId === filterCategoryId && t.status === 'todo'
        )
        break
      case 'tag':
        if (filterTagIds.length === 0) {
          filtered = tasks.filter((t) => t.status === 'todo')
        } else {
          filtered = tasks.filter(
            (t) =>
              t.status === 'todo' &&
              t.tags?.some((tag) => filterTagIds.includes(tag.id))
          )
        }
        break
      default:
        filtered = tasks
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [tasks, filterView, filterCategoryId, filterTagIds, searchQuery])
}