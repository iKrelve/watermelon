import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Calendar } from '@/components/ui/calendar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useUIStore } from '@/stores/ui-store'
import {
  useTasksQuery,
  useCategoriesQuery,
  useUpdateTask,
  useDeleteTask,
} from '@/hooks/useDataQueries'
import {
  getPriorityColor,
  getPriorityBadgeClasses,
} from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task, Priority, RecurrenceRule } from '@shared/types'
import {
  Trash2,
  CalendarDays,
  Flag,
  FolderOpen,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  ListChecks,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Sub-components extracted to task-detail/ directory
import { SubTaskList } from './task-detail/SubTaskList'
import { RecurrenceSettings } from './task-detail/RecurrenceSettings'
import { ReminderSettings } from './task-detail/ReminderSettings'
import { TagSelector } from './task-detail/TagSelector'
import { useDebouncedCallback } from './task-detail/useDebouncedCallback'

// ============================================================
// TaskDetail (main export)
// ============================================================

export function TaskDetail(): React.JSX.Element {
  const { t } = useTranslation()
  const selectedTaskId = useUIStore((s) => s.selectedTaskId)
  const selectTask = useUIStore((s) => s.selectTask)
  const { data: tasks = [] } = useTasksQuery()
  const { data: categories = [] } = useCategoriesQuery()
  const updateTaskMut = useUpdateTask()
  const deleteTaskMut = useDeleteTask()

  const task = tasks.find((t) => t.id === selectedTaskId) ?? null

  // Extract primitive values for stable dependency tracking.
  // Using primitives (instead of the `task` object reference) prevents the
  // effect from re-running on unrelated task-object mutations (e.g. when
  // a debounced save updates the store and creates a new object reference).
  const taskId = task?.id
  const taskTitle = task?.title
  const taskDescription = task?.description

  // Local edit state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Track the last-synced taskId so we can reset local state
  // *during* the render pass (before the first paint) instead of
  // waiting for a useEffect, which would cause the RichTextEditor
  // to flash with stale content when switching tasks.
  const prevTaskIdRef = useRef<string | null | undefined>(undefined)
  if (prevTaskIdRef.current !== taskId) {
    prevTaskIdRef.current = taskId
    // Reset synchronously — React allows calling setState during render
    // when the value is derived from changed props (avoids an extra
    // commit with stale data).
    const nextTitle = taskTitle ?? ''
    const nextDescription = taskDescription ?? ''
    if (title !== nextTitle) setTitle(nextTitle)
    if (description !== nextDescription) setDescription(nextDescription)
  }

  // Also sync when the *same* task's persisted title/description
  // changes from outside (e.g. another window editing the same task).
  useEffect(() => {
    setTitle(taskTitle ?? '')
    setDescription(taskDescription ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on external value changes
  }, [taskTitle, taskDescription])

  // Debounced save for title and description
  const debouncedUpdateTitle = useDebouncedCallback(
    async (value: string) => {
      if (!task || !value.trim()) return
      try {
        await updateTaskMut.mutateAsync({ id: task.id, data: { title: value.trim() } })
      } catch {
        // Error handled globally
      }
    },
    500
  )

  const debouncedUpdateDescription = useDebouncedCallback(
    async (value: string) => {
      if (!task) return
      try {
        await updateTaskMut.mutateAsync({ id: task.id, data: { description: value || null } })
      } catch {
        // Error handled globally
      }
    },
    500
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setTitle(val)
    debouncedUpdateTitle(val)
  }

  const handleRichTextChange = (html: string): void => {
    setDescription(html)
    debouncedUpdateDescription(html)
  }

  const handlePriorityChange = async (priority: string): Promise<void> => {
    if (!task) return
    try {
      await updateTaskMut.mutateAsync({ id: task.id, data: { priority: priority as Priority } })
    } catch {
      // Error handled globally
    }
  }

  const handleCategoryChange = async (categoryId: string): Promise<void> => {
    if (!task) return
    try {
      await updateTaskMut.mutateAsync({
        id: task.id,
        data: { categoryId: categoryId === 'none' ? null : categoryId },
      })
    } catch {
      // Error handled globally
    }
  }

  const handleDueDateChange = async (date: Date | undefined): Promise<void> => {
    if (!task) return
    try {
      await updateTaskMut.mutateAsync({
        id: task.id,
        data: { dueDate: date ? format(date, 'yyyy-MM-dd') : null },
      })
    } catch {
      // Error handled globally
    }
  }

  const handleRecurrenceChange = async (rule: RecurrenceRule | null): Promise<void> => {
    if (!task) return
    try {
      await updateTaskMut.mutateAsync({ id: task.id, data: { recurrenceRule: rule } })
    } catch {
      // Error handled globally
    }
  }

  const handleReminderChange = async (time: string | null): Promise<void> => {
    if (!task) return
    try {
      await updateTaskMut.mutateAsync({ id: task.id, data: { reminderTime: time } })
    } catch {
      // Error handled globally
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!task) return
    try {
      await deleteTaskMut.mutateAsync(task.id)
      selectTask(null)
    } catch {
      // Error handled globally
    }
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <ClipboardList className="size-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground/50">{t('taskDetail.selectTaskHint')}</p>
          <p className="mt-1 text-xs text-muted-foreground/40">{t('taskDetail.quickCreateHint')}</p>
        </div>
      </div>
    )
  }

  const dueDate = task.dueDate ? parseISO(task.dueDate) : undefined
  const subTasks = task.subTasks ?? []
  const hasSubTasks = subTasks.length > 0

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-4">
        {/* ===== Section 1: Core Info (always visible, front and center) ===== */}

        {/* Title + Delete */}
        <div className="flex items-start justify-between gap-2">
          <Input
            value={title}
            onChange={handleTitleChange}
            className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto hover:bg-accent/30 rounded-md transition-colors -ml-1 pl-1"
            placeholder={t('taskDetail.titlePlaceholder')}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                aria-label={t('taskDetail.deleteTask')}
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('taskDetail.confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('taskDetail.confirmDeleteMessage', { title: task.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('taskDetail.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('taskDetail.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Status badge */}
        {task.status === 'completed' && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" />
            {t('taskDetail.completedBadge')}
            {task.completedAt && (
              <span className="text-muted-foreground">
                · {format(parseISO(task.completedAt), 'M月d日', { locale: zhCN })}
              </span>
            )}
          </Badge>
        )}

        {/* Description (always visible, rich text editor) */}
        <RichTextEditor
          key={task.id}
          content={description}
          onChange={handleRichTextChange}
          placeholder={t('taskDetail.descriptionPlaceholder')}
        />

        {/* ===== Section 2: Quick Property Toolbar (compact icon buttons) ===== */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <TooltipProvider delayDuration={300}>
            {/* Priority */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={task.priority !== 'none' ? 'secondary' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 text-xs font-medium',
                        task.priority !== 'none'
                          ? getPriorityBadgeClasses(task.priority)
                          : 'font-normal'
                      )}
                    >
                      <Flag className={cn('size-3.5', task.priority === 'none' ? 'text-muted-foreground' : 'currentColor')} />
                      {task.priority !== 'none' ? (
                        <span>
                          {task.priority === 'high' ? t('priority.high') : task.priority === 'medium' ? t('priority.medium') : t('priority.low')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{t('priority.label')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('priority.label')}</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-36 p-1" align="start">
                {(['none', 'low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors',
                      task.priority === p && 'bg-accent font-medium'
                    )}
                  >
                    <Flag className={cn('size-3.5', getPriorityColor(p))} />
                    <span className="flex-1">
                      {p === 'none' ? t('priority.none') : p === 'low' ? t('priority.low') : p === 'medium' ? t('priority.medium') : t('priority.high')}
                    </span>
                    {p !== 'none' && (
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          p === 'high' && 'bg-red-500',
                          p === 'medium' && 'bg-amber-500',
                          p === 'low' && 'bg-blue-500'
                        )}
                      />
                    )}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Due Date */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 text-xs font-normal',
                        dueDate && 'border-primary/40 text-primary'
                      )}
                    >
                      <CalendarDays className="size-3.5" />
                      {dueDate
                        ? format(dueDate, 'M月d日', { locale: zhCN })
                        : null}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('taskDetail.dueDateLabel')}</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={handleDueDateChange}
                  locale={zhCN}
                />
                {dueDate && (
                  <div className="border-t px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive w-full"
                      onClick={() => handleDueDateChange(undefined)}
                    >
                      {t('taskDetail.clearDate')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Category */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 text-xs font-normal',
                        task.categoryId && 'border-primary/40 text-primary'
                      )}
                    >
                      <FolderOpen className="size-3.5" />
                      {task.categoryId
                        ? categories.find((c) => c.id === task.categoryId)?.name
                        : null}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{t('taskDetail.categoryLabel')}</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-44 p-1" align="start">
                <button
                  onClick={() => handleCategoryChange('none')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors',
                    !task.categoryId && 'bg-accent font-medium'
                  )}
                >
                  {t('taskDetail.noCategory')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors',
                      task.categoryId === cat.id && 'bg-accent font-medium'
                    )}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: cat.color || '#94a3b8' }}
                    />
                    {cat.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Tags */}
            <TagSelector task={task} />

            {/* Recurrence */}
            <RecurrenceSettings
              recurrenceRule={task.recurrenceRule}
              onChange={handleRecurrenceChange}
            />

            {/* Reminder */}
            <ReminderSettings
              reminderTime={task.reminderTime}
              onChange={handleReminderChange}
            />
          </TooltipProvider>
        </div>

        <Separator className="opacity-60" />

        {/* ===== Section 3: Sub-tasks (collapsible, reduces initial noise) ===== */}
        <Collapsible defaultOpen={hasSubTasks}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronRight className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            <ListChecks className="size-3.5" />
            <span>{t('taskDetail.subtasksLabel')}</span>
            {hasSubTasks && (
              <span className="text-muted-foreground/60">
                {subTasks.filter((s) => s.completed).length}/{subTasks.length}
              </span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2">
              <SubTaskList task={task} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Footer metadata */}
        <div className="pt-4 pb-2 text-[11px] text-muted-foreground/40 space-y-0.5">
          <p>{t('taskDetail.createdAt', { date: format(parseISO(task.createdAt), 'yyyy-MM-dd HH:mm') })}</p>
          <p>{t('taskDetail.updatedAt', { date: format(parseISO(task.updatedAt), 'yyyy-MM-dd HH:mm') })}</p>
        </div>
      </div>
    </ScrollArea>
  )
}
