import { useMemo, useState, useRef, useCallback } from 'react'
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
import {
  getPriorityLabel,
  getPriorityBadgeClasses,
  getPriorityStripeColor,
  sortByPriority
} from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task, SubTask } from '../../../shared/types'
import {
  CalendarDays,
  AlertCircle,
  Repeat,
  ListChecks,
  Search,
  ArrowUpDown,
  Plus,
  X,
  Inbox,
  Sun,
  CalendarRange,
  CheckCircle2,
  FolderOpen,
  Tag,
  ClipboardList,
  ChevronRight,
  ChevronDown,
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
      return '全部'
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
// SubTaskRow — compact sub-task row shown inside TaskItem
// ============================================================

function SubTaskRow({
  subTask,
  onToggle,
}: {
  subTask: SubTask
  onToggle: (id: string, completed: boolean) => void
}): React.JSX.Element {
  const formattedDueDate = subTask.dueDate
    ? format(parseISO(subTask.dueDate), 'M月d日', { locale: zhCN })
    : null

  const isOverdueSubTask =
    subTask.dueDate &&
    !subTask.completed &&
    new Date(subTask.dueDate) < new Date(new Date().toDateString())

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 py-1 pl-2 pr-1',
        'hover:bg-accent/40 rounded transition-colors',
        isOverdueSubTask && 'bg-destructive/5'
      )}
    >
      {/* Sub-task priority stripe */}
      {subTask.priority !== 'none' && (
        <div
          className={cn(
            'absolute left-0 top-1 bottom-1 w-[2px] rounded-full',
            getPriorityStripeColor(subTask.priority)
          )}
        />
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={subTask.completed}
          onCheckedChange={(checked) => onToggle(subTask.id, checked === true)}
          className={cn(
            'size-3 rounded-full transition-colors',
            subTask.priority === 'high' &&
              'border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500',
            subTask.priority === 'medium' &&
              'border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500',
            subTask.priority === 'low' &&
              'border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500'
          )}
        />
      </div>

      <span
        className={cn(
          'flex-1 min-w-0 text-[12px] truncate',
          subTask.completed && 'line-through text-muted-foreground'
        )}
      >
        {subTask.title}
      </span>

      {/* Inline indicators */}
      {subTask.priority !== 'none' && (
        <Badge
          variant="secondary"
          className={cn(
            'text-[8px] px-1 py-0 h-3 border-0 font-medium shrink-0',
            getPriorityBadgeClasses(subTask.priority)
          )}
        >
          {getPriorityLabel(subTask.priority)}
        </Badge>
      )}
      {formattedDueDate && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[10px] shrink-0',
            isOverdueSubTask ? 'text-destructive font-medium' : 'text-muted-foreground'
          )}
        >
          {isOverdueSubTask && <AlertCircle className="size-2.5" />}
          {formattedDueDate}
          {isOverdueSubTask && ' 已过期'}
        </span>
      )}
    </div>
  )
}

// ============================================================
// TaskItem component
// ============================================================

function TaskItem({ task, isSelected }: { task: Task; isSelected: boolean }): React.JSX.Element {
  const { dispatch, completeTask, updateSubTask, refreshTasks } = useApp()
  const overdue = isOverdue(task)
  const isCompleted = task.status === 'completed'
  const subTasks = task.subTasks ?? []
  const subTaskCount = subTasks.length
  const completedSubTasks = subTasks.filter((s) => s.completed).length
  const [expanded, setExpanded] = useState(subTaskCount > 0)

  const handleSelect = (): void => {
    dispatch({ type: 'SELECT_TASK', payload: task.id })
  }

  const handleComplete = async (checked: boolean | 'indeterminate'): Promise<void> => {
    if (checked === true && !isCompleted) {
      try {
        await completeTask(task.id)
      } catch {
        // Will be handled by error handler
      }
    }
  }

  const handleToggleSubTask = useCallback(
    async (subTaskId: string, completed: boolean): Promise<void> => {
      try {
        await updateSubTask(subTaskId, { completed })
        await refreshTasks()
      } catch {
        // Error handled globally
      }
    },
    [updateSubTask, refreshTasks]
  )

  const toggleExpand = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      setExpanded((prev) => !prev)
    },
    []
  )

  const formattedDueDate = task.dueDate
    ? format(parseISO(task.dueDate), 'M月d日', { locale: zhCN })
    : null

  return (
    <div className="animate-list-enter">
      {/* Main task row */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`任务: ${task.title}${isCompleted ? ' (已完成)' : ''}${overdue ? ' (已过期)' : ''}`}
        onClick={handleSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect()
          }
        }}
        className={cn(
          'group relative flex items-center gap-3 px-4 py-3 cursor-pointer',
          'rounded-lg mx-1.5 my-0.5',
          'transition-all duration-150',
          'hover:bg-accent/60',
          isSelected && 'bg-accent shadow-sm',
          overdue && !isCompleted && 'ring-1 ring-inset ring-destructive/20 bg-destructive/5'
        )}
      >
        {/* Priority stripe */}
        {task.priority !== 'none' && (
          <div
            className={cn(
              'absolute left-0 top-2 bottom-2 w-[3px] rounded-full',
              getPriorityStripeColor(task.priority)
            )}
          />
        )}

        {/* Checkbox */}
        <div className="no-drag shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleComplete}
            aria-label={isCompleted ? '标记为未完成' : '标记为完成'}
            className={cn(
              'size-[18px] rounded-full transition-colors',
              task.priority === 'high' && 'border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500',
              task.priority === 'medium' && 'border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500',
              task.priority === 'low' && 'border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p
            className={cn(
              'text-[13px] leading-snug truncate',
              isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </p>

          {/* Meta row — only show most important indicators */}
          <div className="flex items-center gap-2 mt-1">
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
                {overdue && !isCompleted && ' 已过期'}
              </span>
            )}

            {/* Priority badge — always visible with colored background */}
            {task.priority !== 'none' && (
              <Badge
                variant="secondary"
                className={cn(
                  'text-[10px] px-1.5 py-0 h-4 border-0 font-medium',
                  getPriorityBadgeClasses(task.priority)
                )}
              >
                {getPriorityLabel(task.priority)}
              </Badge>
            )}

            {/* Sub-task expand toggle */}
            {subTaskCount > 0 && (
              <button
                type="button"
                onClick={toggleExpand}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] text-muted-foreground',
                  'hover:text-foreground transition-colors rounded px-1 -ml-1',
                  expanded && 'text-foreground'
                )}
                aria-label={expanded ? '收起子任务' : '展开子任务'}
              >
                {expanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                <ListChecks className="size-3" />
                {completedSubTasks}/{subTaskCount}
              </button>
            )}

            {/* Recurrence indicator */}
            {task.recurrenceRule && (
              <Repeat className="size-3 text-muted-foreground" />
            )}

            {/* Tags — show only color dots to save space */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-0.5 ml-auto">
                {task.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                    title={tag.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable sub-task list */}
      {expanded && subTaskCount > 0 && (
        <div
          className="ml-11 mr-3 mb-1 border-l-2 border-border/50 pl-2 space-y-0.5 animate-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {subTasks.map((st) => (
            <SubTaskRow
              key={st.id}
              subTask={st}
              onToggle={handleToggleSubTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// AddTaskBar component
// ============================================================

function AddTaskBar(): React.JSX.Element | null {
  const [title, setTitle] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { createTask, state, dispatch } = useApp()

  const handleSubmit = async (): Promise<void> => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const task = await createTask({
        title: trimmed,
        categoryId:
          state.filterView === 'category' && state.filterCategoryId
            ? state.filterCategoryId
            : undefined,
      })
      setTitle('')
      // Auto-select the newly created task so user can immediately edit details
      dispatch({ type: 'SELECT_TASK', payload: task.id })
      inputRef.current?.focus()
    } catch {
      // Will be handled by error handler
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setTitle('')
      inputRef.current?.blur()
    }
  }

  // Don't show AddTaskBar in completed view
  if (state.filterView === 'completed') return null

  return (
    <div
      className={cn(
        'border-b border-border/60 px-4 py-2.5 transition-colors duration-150',
        isFocused ? 'bg-accent/30' : 'bg-transparent'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex size-5 items-center justify-center rounded-full shrink-0 transition-colors duration-150',
            isFocused
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/10 text-primary'
          )}
        >
          <Plus className="size-3" />
        </div>
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="添加新任务，按 Enter 确认"
          className="h-8 border-none shadow-none focus-visible:ring-0 px-0 text-[13px] placeholder:text-muted-foreground/50"
          disabled={isSubmitting}
        />
        {title.trim() && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground hover:text-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="添加任务"
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// SearchBar component
// ============================================================

function SearchBar(): React.JSX.Element {
  const { state, dispatch } = useApp()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleSearch = (): void => {
    if (isSearchOpen) {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })
      setIsSearchOpen(false)
    } else {
      setIsSearchOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isSearchOpen ? 'w-40 opacity-100' : 'w-0 opacity-0'
        )}
      >
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={state.searchQuery}
            onChange={(e) =>
              dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })
            }
            placeholder="搜索任务..."
            className="h-7 pl-7 pr-7 text-xs border-muted rounded-md"
          />
          {state.searchQuery && (
            <button
              aria-label="清除搜索"
              onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={toggleSearch}
        aria-label={isSearchOpen ? '关闭搜索' : '搜索'}
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
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label="排序方式">
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

const EMPTY_STATE_CONFIG: Record<
  string,
  { icon: React.ReactNode; text: string; hint?: string; showAddButton?: boolean }
> = {
  all: {
    icon: <Inbox className="size-10 text-muted-foreground/30" />,
    text: '任务列表是空的',
    hint: '在上方输入框中创建你的第一个任务',
    showAddButton: true,
  },
  today: {
    icon: <Sun className="size-10 text-muted-foreground/30" />,
    text: '今天没有待办任务',
    hint: '享受轻松的一天吧',
  },
  upcoming: {
    icon: <CalendarRange className="size-10 text-muted-foreground/30" />,
    text: '未来 7 天没有安排',
  },
  completed: {
    icon: <CheckCircle2 className="size-10 text-muted-foreground/30" />,
    text: '还没有已完成的任务',
  },
  category: {
    icon: <FolderOpen className="size-10 text-muted-foreground/30" />,
    text: '该分类下没有任务',
    hint: '在上方输入框中添加任务到该分类',
    showAddButton: true,
  },
  tag: {
    icon: <Tag className="size-10 text-muted-foreground/30" />,
    text: '该标签下没有任务',
  },
}

function EmptyState({
  filterView,
  onAddTask,
}: {
  filterView: string
  onAddTask?: () => void
}): React.JSX.Element {
  const config = EMPTY_STATE_CONFIG[filterView] ?? {
    icon: <ClipboardList className="size-10 text-muted-foreground/30" />,
    text: '没有找到匹配的任务',
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="mb-4">{config.icon}</div>
      <p className="text-sm font-medium text-muted-foreground/70">{config.text}</p>
      {config.hint && (
        <p className="mt-1.5 text-xs text-muted-foreground/50">{config.hint}</p>
      )}
      {config.showAddButton && onAddTask && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 text-xs"
          onClick={onAddTask}
        >
          <Plus className="size-3.5" />
          创建任务
        </Button>
      )}
      <p className="text-[11px] mt-3 text-muted-foreground/30">Cmd+N 快速创建</p>
    </div>
  )
}

// ============================================================
// TaskList (main export)
// ============================================================

export function TaskList(): React.JSX.Element {
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

  const focusAddTask = (): void => {
    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder="添加新任务，按 Enter 确认"]'
    )
    input?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* List Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight truncate">{title}</h2>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {sortedTasks.length} 个任务
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
          <EmptyState filterView={state.filterView} onAddTask={focusAddTask} />
        ) : (
          <div className="py-1.5 px-0.5">
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
    </div>
  )
}
