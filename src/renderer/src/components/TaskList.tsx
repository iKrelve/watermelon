import { useMemo, useState, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp } from '@/context/AppContext'
import { filterToday, filterUpcoming, isOverdue } from '@/utils/date-filters'
import { getPriorityColor, getPriorityLabel, sortByPriority } from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task } from '../../../shared/types'
import {
  CalendarDays,
  AlertCircle,
  Repeat,
  ListChecks,
  Search,
  ArrowUpDown,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Sort options
// ============================================================

type SortOption = 'default' | 'dueDate' | 'priority' | 'createdAt'

const SORT_LABELS: Record<SortOption, string> = {
  default: '默认',
  dueDate: '按截止日期',
  priority: '按优先级',
  createdAt: '按创建时间',
}

function applySortOption(tasks: Task[], sortOption: SortOption): Task[] {
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
      return tasks
  }
}

// ============================================================
// Filter title helper
// ============================================================

function getFilterTitle(
  filterView: string,
  categories: { id: string; name: string }[],
  filterCategoryId: string | null,
  tags: { id: string; name: string }[],
  filterTagIds: string[]
): string {
  switch (filterView) {
    case 'all':
      return '收件箱'
    case 'today':
      return '今天'
    case 'upcoming':
      return '即将到来'
    case 'completed':
      return '已完成'
    case 'category': {
      const cat = categories.find((c) => c.id === filterCategoryId)
      return cat?.name ?? '分类'
    }
    case 'tag': {
      if (filterTagIds.length === 1) {
        const tag = tags.find((t) => t.id === filterTagIds[0])
        return tag?.name ?? '标签'
      }
      return `标签 (${filterTagIds.length})`
    }
    default:
      return '任务'
  }
}

// ============================================================
// Filtered tasks hook
// ============================================================

function useFilteredTasks(): Task[] {
  const { state } = useApp()
  const { tasks, filterView, filterCategoryId, filterTagIds, searchQuery } = state

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

// ============================================================
// TaskItem component
// ============================================================

function TaskItem({ task, isSelected }: { task: Task; isSelected: boolean }) {
  const { dispatch, completeTask } = useApp()
  const overdue = isOverdue(task)
  const isCompleted = task.status === 'completed'
  const subTaskCount = task.subTasks?.length ?? 0
  const completedSubTasks = task.subTasks?.filter((s) => s.completed).length ?? 0

  const handleSelect = () => {
    dispatch({ type: 'SELECT_TASK', payload: task.id })
  }

  const handleComplete = async (checked: boolean | 'indeterminate') => {
    if (checked === true && !isCompleted) {
      try {
        await completeTask(task.id)
      } catch {
        // Will be handled by error handler
      }
    }
  }

  const formattedDueDate = task.dueDate
    ? format(parseISO(task.dueDate), 'M月d日', { locale: zhCN })
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleSelect()
        }
      }}
      className={cn(
        'group flex items-start gap-3 px-4 py-2.5 border-b border-border/50 cursor-pointer transition-colors',
        'hover:bg-accent/50',
        isSelected && 'bg-accent',
        overdue && !isCompleted && 'border-l-2 border-l-destructive'
      )}
    >
      {/* Checkbox */}
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleComplete}
          className={cn(
            'size-4.5 rounded-full',
            task.priority === 'high' && 'border-red-400',
            task.priority === 'medium' && 'border-orange-400',
            task.priority === 'low' && 'border-blue-400'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p
          className={cn(
            'text-sm leading-snug truncate',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Priority badge */}
          {task.priority !== 'none' && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 h-4',
                getPriorityColor(task.priority)
              )}
            >
              {getPriorityLabel(task.priority)}
            </Badge>
          )}

          {/* Due date */}
          {formattedDueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px]',
                overdue && !isCompleted
                  ? 'text-destructive font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {overdue && !isCompleted ? (
                <AlertCircle className="size-3" />
              ) : (
                <CalendarDays className="size-3" />
              )}
              {formattedDueDate}
            </span>
          )}

          {/* Sub-task count */}
          {subTaskCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ListChecks className="size-3" />
              {completedSubTasks}/{subTaskCount}
            </span>
          )}

          {/* Recurrence indicator */}
          {task.recurrenceRule && (
            <Repeat className="size-3 text-muted-foreground" />
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {task.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  {tag.name}
                </span>
              ))}
              {task.tags.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// AddTaskBar component
// ============================================================

function AddTaskBar() {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { createTask, state } = useApp()

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      await createTask({
        title: trimmed,
        // Automatically assign category if viewing a category filter
        categoryId:
          state.filterView === 'category' && state.filterCategoryId
            ? state.filterCategoryId
            : undefined,
      })
      setTitle('')
      inputRef.current?.focus()
    } catch {
      // Will be handled by error handler
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Don't show AddTaskBar in completed view
  if (state.filterView === 'completed') return null

  return (
    <div className="border-t border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加新任务..."
          className="h-8 border-none shadow-none focus-visible:ring-0 px-0 text-sm placeholder:text-muted-foreground/60"
          disabled={isSubmitting}
        />
      </div>
    </div>
  )
}

// ============================================================
// SearchBar component
// ============================================================

function SearchBar() {
  const { state, dispatch } = useApp()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleSearch = () => {
    if (isSearchOpen) {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })
      setIsSearchOpen(false)
    } else {
      setIsSearchOpen(true)
      // Focus the input after it renders
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {isSearchOpen && (
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={state.searchQuery}
            onChange={(e) =>
              dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })
            }
            placeholder="搜索任务..."
            className="h-7 pl-7 pr-7 text-xs border-muted"
          />
          {state.searchQuery && (
            <button
              onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={toggleSearch}
      >
        {isSearchOpen ? (
          <X className="size-3.5" />
        ) : (
          <Search className="size-3.5" />
        )}
      </Button>
    </div>
  )
}

// ============================================================
// SortMenu component
// ============================================================

function SortMenu({
  sortOption,
  onSortChange,
}: {
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0">
          <ArrowUpDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => onSortChange(option)}
            className={cn(sortOption === option && 'bg-accent font-medium')}
          >
            {SORT_LABELS[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================
// Empty state
// ============================================================

function EmptyState({ filterView }: { filterView: string }) {
  const messages: Record<string, { emoji: string; text: string }> = {
    all: { emoji: '📭', text: '收件箱是空的，添加一个新任务吧' },
    today: { emoji: '☀️', text: '今天没有待办任务' },
    upcoming: { emoji: '📅', text: '未来 7 天没有安排' },
    completed: { emoji: '🎉', text: '还没有已完成的任务' },
    category: { emoji: '📁', text: '该分类下没有任务' },
    tag: { emoji: '🏷️', text: '该标签下没有任务' },
  }
  const msg = messages[filterView] ?? { emoji: '📋', text: '没有找到匹配的任务' }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <span className="text-3xl mb-3">{msg.emoji}</span>
      <p className="text-sm">{msg.text}</p>
    </div>
  )
}

// ============================================================
// TaskList (main export)
// ============================================================

export function TaskList() {
  const { state } = useApp()
  const filteredTasks = useFilteredTasks()
  const [sortOption, setSortOption] = useState<SortOption>('default')

  const sortedTasks = useMemo(
    () => applySortOption(filteredTasks, sortOption),
    [filteredTasks, sortOption]
  )

  const title = getFilterTitle(
    state.filterView,
    state.categories,
    state.filterCategoryId,
    state.tags,
    state.filterTagIds
  )

  return (
    <div className="flex h-full flex-col">
      {/* List Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {sortedTasks.length} 个任务
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <SearchBar />
          <SortMenu sortOption={sortOption} onSortChange={setSortOption} />
        </div>
      </div>

      {/* Task Items */}
      <ScrollArea className="flex-1">
        {sortedTasks.length === 0 ? (
          <EmptyState filterView={state.filterView} />
        ) : (
          <div className="py-1">
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={state.selectedTaskId === task.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Quick Add Task Bar */}
      <AddTaskBar />
    </div>
  )
}
