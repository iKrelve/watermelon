import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUIStore } from '@/stores/ui-store'
import {
  useCategoriesQuery,
  useTagsQuery,
  useReorderTasks,
  useDeleteTask,
  useCompleteTask,
  useUpdateTask,
} from '@/hooks/useDataQueries'
import type { Priority } from '@shared/types'

import { useFilteredTasks } from './hooks/useFilteredTasks'
import { applySortOption, type SortOption } from './utils/sort'
import { getFilterTitle } from './utils/filter-title'
import { SortableTaskItem } from './SortableTaskItem'
import { TaskItem } from './TaskItem'
import { DragOverlayTaskItem } from './DragOverlayTaskItem'
import { AddTaskBar } from './AddTaskBar'
import { SearchBar } from './SearchBar'
import { SortMenu } from './SortMenu'
import { EmptyState } from './EmptyState'
import { TaskContextMenu } from './TaskContextMenu'

export function TaskList(): React.JSX.Element {
  const { t } = useTranslation()
  const selectedTaskId = useUIStore((s) => s.selectedTaskId)
  const selectTask = useUIStore((s) => s.selectTask)
  const filterView = useUIStore((s) => s.filterView)
  const filterCategoryId = useUIStore((s) => s.filterCategoryId)
  const filterTagIds = useUIStore((s) => s.filterTagIds)

  const { data: categories = [] } = useCategoriesQuery()
  const { data: tags = [] } = useTagsQuery()

  const reorderTasksMut = useReorderTasks()
  const deleteTaskMut = useDeleteTask()
  const completeTaskMut = useCompleteTask()
  const updateTaskMut = useUpdateTask()
  const filteredTasks = useFilteredTasks()
  const [sortOption, setSortOption] = useState<SortOption>('default')
  const [activeId, setActiveId] = useState<string | null>(null)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedRef = useRef<string | null>(null)

  const sortedTasks = useMemo(
    () => applySortOption(filteredTasks, sortOption),
    [filteredTasks, sortOption]
  )

  // Clear multi-selection when filter view changes
  useEffect(() => {
    setSelectedIds(new Set())
    lastClickedRef.current = null
  }, [filterView, filterCategoryId])

  // Check if drag-and-drop should be enabled (only in default sort + all/category views)
  const isDragEnabled = sortOption === 'default' &&
    (filterView === 'all' || filterView === 'category')

  const title = getFilterTitle(
    t,
    filterView,
    categories,
    filterCategoryId,
    tags,
    filterTagIds
  )

  const focusAddTask = (): void => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-shortcut-target="add-task"]'
    )
    input?.focus()
  }

  // Multi-select handler: Cmd/Ctrl+Click toggles, Shift+Click range-selects
  const handleTaskSelect = useCallback(
    (taskId: string, e: React.MouseEvent): void => {
      const isMeta = e.metaKey || e.ctrlKey
      const isShift = e.shiftKey

      if (isMeta) {
        // Toggle individual selection
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(taskId)) {
            next.delete(taskId)
          } else {
            next.add(taskId)
          }
          return next
        })
        lastClickedRef.current = taskId
        // Also update detail panel
        selectTask(taskId)
      } else if (isShift && lastClickedRef.current) {
        // Range selection
        const lastIndex = sortedTasks.findIndex((t) => t.id === lastClickedRef.current)
        const currentIndex = sortedTasks.findIndex((t) => t.id === taskId)
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)
          const rangeIds = sortedTasks.slice(start, end + 1).map((t) => t.id)
          setSelectedIds((prev) => {
            const next = new Set(prev)
            for (const id of rangeIds) {
              next.add(id)
            }
            return next
          })
        }
        selectTask(taskId)
      } else {
        // Normal click — clear multi-selection and select single task
        setSelectedIds(new Set())
        lastClickedRef.current = taskId
        selectTask(taskId)
      }
    },
    [sortedTasks, selectTask]
  )

  // Batch operations — run in parallel for better responsiveness
  const handleBatchDelete = useCallback(async (): Promise<void> => {
    const ids = Array.from(selectedIds)
    await Promise.allSettled(ids.map((id) => deleteTaskMut.mutateAsync(id)))
    setSelectedIds(new Set())
  }, [selectedIds, deleteTaskMut])

  const handleBatchComplete = useCallback(async (): Promise<void> => {
    const ids = Array.from(selectedIds)
    await Promise.allSettled(ids.map((id) => completeTaskMut.mutateAsync(id)))
    setSelectedIds(new Set())
  }, [selectedIds, completeTaskMut])

  const handleBatchSetPriority = useCallback(
    async (priority: Priority): Promise<void> => {
      const ids = Array.from(selectedIds)
      await Promise.allSettled(
        ids.map((id) => updateTaskMut.mutateAsync({ id, data: { priority } }))
      )
    },
    [selectedIds, updateTaskMut]
  )

  const handleClearSelection = useCallback((): void => {
    setSelectedIds(new Set())
  }, [])

  // Keyboard shortcut: Escape to clear selection, Cmd+A to select all
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && sortedTasks.length > 0) {
        // Only capture Cmd+A when task list is focused (not in input)
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return
        e.preventDefault()
        setSelectedIds(new Set(sortedTasks.map((t) => t.id)))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIds.size, sortedTasks])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must move 8px before drag starts, prevents accidental drags
      },
    })
  )

  const activeTask = useMemo(
    () => (activeId ? sortedTasks.find((t) => t.id === activeId) : null),
    [activeId, sortedTasks]
  )

  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = sortedTasks.findIndex((t) => t.id === active.id)
      const newIndex = sortedTasks.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(sortedTasks, oldIndex, newIndex)
      const items = reordered.map((task, index) => ({
        id: task.id,
        sortOrder: index,
      }))

      try {
        await reorderTasksMut.mutateAsync(items)
      } catch {
        // Error handled by context
      }
    },
    [sortedTasks, reorderTasksMut]
  )

  const handleDragCancel = useCallback((): void => {
    setActiveId(null)
  }, [])

  const taskIds = useMemo(
    () => sortedTasks.map((t) => t.id),
    [sortedTasks]
  )

  return (
    <div className="flex h-full flex-col">
      {/* List Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight truncate">{title}</h2>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {t('filter.taskCount', { count: sortedTasks.length })}
            {selectedIds.size > 0 && (
              <span className="ml-1 text-primary font-medium">
                · {t('filter.selectedCount', { count: selectedIds.size })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <SearchBar />
          <SortMenu sortOption={sortOption} onSortChange={setSortOption} />
        </div>
      </div>

      {/* Quick Add Task Bar - at the top for better discoverability */}
      <AddTaskBar />

      {/* Task Items */}
      <ScrollArea className="flex-1">
        {sortedTasks.length === 0 ? (
          <EmptyState filterView={filterView} onAddTask={focusAddTask} />
        ) : isDragEnabled ? (
          <TaskContextMenu
            selectedIds={selectedIds}
            onBatchDelete={handleBatchDelete}
            onBatchComplete={handleBatchComplete}
            onBatchSetPriority={handleBatchSetPriority}
            onClearSelection={handleClearSelection}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={taskIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="py-1.5 px-0.5">
                  {sortedTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskId === task.id}
                      isMultiSelected={selectedIds.has(task.id)}
                      onSelect={handleTaskSelect}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeTask ? <DragOverlayTaskItem task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </TaskContextMenu>
        ) : (
          <TaskContextMenu
            selectedIds={selectedIds}
            onBatchDelete={handleBatchDelete}
            onBatchComplete={handleBatchComplete}
            onBatchSetPriority={handleBatchSetPriority}
            onClearSelection={handleClearSelection}
          >
            <div className="py-1.5 px-0.5">
              {sortedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                />
              ))}
            </div>
          </TaskContextMenu>
        )}
      </ScrollArea>
    </div>
  )
}
