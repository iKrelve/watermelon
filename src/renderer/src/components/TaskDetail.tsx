import { useState, useEffect, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useApp } from '@/context/AppContext'
import { getPriorityColor, getPriorityBadgeClasses } from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task, Priority, RecurrenceRule, RecurrenceType } from '../../../shared/types'
import {
  Trash2,
  CalendarDays,
  Flag,
  FolderOpen,
  Tag,
  Bell,
  Repeat,
  Plus,
  X,
  CheckCircle2,
  ClipboardList,
  ChevronRight,
  ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Debounced update hook
// ============================================================

function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  ) as T
}

// ============================================================
// SubTaskList component
// ============================================================

function SubTaskList({ task }: { task: Task }) {
  const { createSubTask, updateSubTask, deleteSubTask, refreshTasks } = useApp()
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const subTasks = task.subTasks ?? []
  const completedCount = subTasks.filter((s) => s.completed).length

  const handleAddSubTask = async () => {
    const trimmed = newSubTaskTitle.trim()
    if (!trimmed) return

    try {
      await createSubTask(task.id, { title: trimmed })
      setNewSubTaskTitle('')
      inputRef.current?.focus()
    } catch {
      // Error handled by global handler
    }
  }

  const handleToggleSubTask = async (subTaskId: string, completed: boolean) => {
    try {
      await updateSubTask(subTaskId, { completed })
      await refreshTasks()
    } catch {
      // Error handled by global handler
    }
  }

  const handleDeleteSubTask = async (subTaskId: string) => {
    try {
      await deleteSubTask(subTaskId)
      await refreshTasks()
    } catch {
      // Error handled by global handler
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          子任务
        </h4>
        {subTasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{subTasks.length}
          </span>
        )}
      </div>

      {/* Sub-task items */}
      <div className="space-y-1">
        {subTasks.map((subTask) => (
          <div
            key={subTask.id}
            className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50"
          >
            <Checkbox
              checked={subTask.completed}
              onCheckedChange={(checked) =>
                handleToggleSubTask(subTask.id, checked === true)
              }
              className="size-3.5"
            />
            <span
              className={cn(
                'flex-1 text-sm',
                subTask.completed && 'line-through text-muted-foreground'
              )}
            >
              {subTask.title}
            </span>
            <button
              aria-label={`删除子任务: ${subTask.title}`}
              onClick={() => handleDeleteSubTask(subTask.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="size-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>

      {/* Add sub-task */}
      <div className="flex items-center gap-2">
        <Plus className="size-3.5 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={newSubTaskTitle}
          onChange={(e) => setNewSubTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddSubTask()
            }
          }}
          placeholder="添加子任务..."
          className="h-7 border-none shadow-none focus-visible:ring-0 px-0 text-sm"
        />
      </div>

      {/* All complete indicator */}
      {subTasks.length > 0 && completedCount === subTasks.length && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" />
          所有子任务已完成
        </div>
      )}
    </div>
  )
}

// ============================================================
// RecurrenceSettings component
// ============================================================

const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  custom: '自定义',
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function RecurrenceSettings({
  recurrenceRule,
  onChange,
}: {
  recurrenceRule: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  const handleTypeChange = (type: string): void => {
    if (type === 'none') {
      onChange(null)
      return
    }
    const newRule: RecurrenceRule = {
      type: type as RecurrenceType,
      interval: recurrenceRule?.interval ?? 1,
      daysOfWeek: type === 'weekly' ? recurrenceRule?.daysOfWeek ?? [1] : undefined,
      dayOfMonth: type === 'monthly' ? recurrenceRule?.dayOfMonth ?? 1 : undefined,
    }
    onChange(newRule)
  }

  const handleIntervalChange = (interval: number): void => {
    if (!recurrenceRule) return
    onChange({ ...recurrenceRule, interval: Math.max(1, interval) })
  }

  const toggleWeekday = (day: number): void => {
    if (!recurrenceRule) return
    const current = recurrenceRule.daysOfWeek ?? []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort()
    if (updated.length === 0) return // At least one day must be selected
    onChange({ ...recurrenceRule, daysOfWeek: updated })
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1.5 text-xs font-normal',
                recurrenceRule && 'border-primary/40 text-primary'
              )}
            >
              <Repeat className="size-3.5" />
              {recurrenceRule
                ? `${RECURRENCE_TYPE_LABELS[recurrenceRule.type]}${
                    recurrenceRule.interval > 1 ? ` ×${recurrenceRule.interval}` : ''
                  }`
                : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>重复</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <Select
            value={recurrenceRule?.type ?? 'none'}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不重复</SelectItem>
              <SelectItem value="daily">每天</SelectItem>
              <SelectItem value="weekly">每周</SelectItem>
              <SelectItem value="monthly">每月</SelectItem>
              <SelectItem value="custom">自定义</SelectItem>
            </SelectContent>
          </Select>

          {recurrenceRule && (
            <>
              {/* Interval */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">每</span>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={recurrenceRule.interval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  className="h-7 w-16 text-sm text-center"
                />
                <span className="text-xs text-muted-foreground">
                  {recurrenceRule.type === 'daily'
                    ? '天'
                    : recurrenceRule.type === 'weekly'
                      ? '周'
                      : recurrenceRule.type === 'monthly'
                        ? '月'
                        : '次'}
                </span>
              </div>

              {/* Weekly - day selector */}
              {recurrenceRule.type === 'weekly' && (
                <div className="flex gap-1">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <button
                      key={index}
                      onClick={() => toggleWeekday(index)}
                      className={cn(
                        'size-7 rounded-full text-xs font-medium transition-colors',
                        recurrenceRule.daysOfWeek?.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Monthly - day of month */}
              {recurrenceRule.type === 'monthly' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">每月第</span>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={recurrenceRule.dayOfMonth ?? 1}
                    onChange={(e) =>
                      onChange({
                        ...recurrenceRule,
                        dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                      })
                    }
                    className="h-7 w-16 text-sm text-center"
                  />
                  <span className="text-xs text-muted-foreground">天</span>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// ReminderSettings component
// ============================================================

function ReminderSettings({
  reminderTime,
  onChange,
}: {
  reminderTime: string | null
  onChange: (time: string | null) => void
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const currentDate = reminderTime ? parseISO(reminderTime) : null

  const handleDateSelect = (date: Date | undefined): void => {
    if (!date) {
      onChange(null)
      return
    }
    // Preserve existing time or set to 9:00
    const hours = currentDate ? currentDate.getHours() : 9
    const minutes = currentDate ? currentDate.getMinutes() : 0
    date.setHours(hours, minutes, 0, 0)
    onChange(date.toISOString())
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const [hours, minutes] = e.target.value.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return

    const date = currentDate ? new Date(currentDate) : new Date()
    date.setHours(hours, minutes, 0, 0)
    onChange(date.toISOString())
  }

  const handleClear = (): void => {
    onChange(null)
    setIsOpen(false)
  }

  const timeValue = currentDate
    ? `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`
    : '09:00'

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1.5 text-xs font-normal',
                reminderTime && 'border-primary/40 text-primary'
              )}
            >
              <Bell className="size-3.5" />
              {reminderTime
                ? format(parseISO(reminderTime), 'M月d日 HH:mm', { locale: zhCN })
                : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>提醒</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <Calendar
            mode="single"
            selected={currentDate ?? undefined}
            onSelect={handleDateSelect}
            locale={zhCN}
          />
          <div className="flex items-center gap-2 px-1">
            <Bell className="size-3.5 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="h-7 w-28 text-sm"
            />
            {reminderTime && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive"
                onClick={handleClear}
              >
                清除
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Tag selector
// ============================================================

function TagSelector({ task }: { task: Task }): React.JSX.Element {
  const { state, addTagToTask, removeTagFromTask, createTag } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const taskTagIds = (task.tags ?? []).map((t) => t.id)
  const availableTags = state.tags.filter((t) => !taskTagIds.includes(t.id))

  const handleAddTag = async (tagId: string): Promise<void> => {
    try {
      await addTagToTask(task.id, tagId)
    } catch {
      // Error handled globally
    }
  }

  const handleRemoveTag = async (tagId: string): Promise<void> => {
    try {
      await removeTagFromTask(task.id, tagId)
    } catch {
      // Error handled globally
    }
  }

  const handleCreateAndAdd = async (): Promise<void> => {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    try {
      const tag = await createTag(trimmed)
      await addTagToTask(task.id, tag.id)
      setNewTagName('')
    } catch {
      // Error handled globally
    }
  }

  const tagCount = task.tags?.length ?? 0

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1.5 text-xs font-normal',
                tagCount > 0 && 'border-primary/40 text-primary'
              )}
            >
              <Tag className="size-3.5" />
              {tagCount > 0 ? `${tagCount}` : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>标签</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-2">
          {/* Current tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-1">
              {task.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1 text-xs pl-2 pr-1"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Available tags */}
          {availableTags.length > 0 && (
            <div className="space-y-0.5">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          <Separator />

          {/* Create new tag */}
          <div className="flex items-center gap-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateAndAdd()
                }
              }}
              placeholder="新建标签..."
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={handleCreateAndAdd}
              disabled={!newTagName.trim()}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// TaskDetail (main export)
// ============================================================

export function TaskDetail() {
  const { state, updateTask, deleteTask, dispatch } = useApp()
  const { selectedTaskId, tasks, categories } = state

  const task = tasks.find((t) => t.id === selectedTaskId) ?? null

  // Local edit state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Sync local state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
    }
  }, [task?.id, task?.title, task?.description])

  // Debounced save for title and description
  const debouncedUpdateTitle = useDebouncedCallback(
    async (value: string) => {
      if (!task || !value.trim()) return
      try {
        await updateTask(task.id, { title: value.trim() })
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
        await updateTask(task.id, { description: value || null })
      } catch {
        // Error handled globally
      }
    },
    500
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    debouncedUpdateTitle(val)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setDescription(val)
    debouncedUpdateDescription(val)
  }

  const handlePriorityChange = async (priority: string) => {
    if (!task) return
    try {
      await updateTask(task.id, { priority: priority as Priority })
    } catch {
      // Error handled globally
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    if (!task) return
    try {
      await updateTask(task.id, {
        categoryId: categoryId === 'none' ? null : categoryId,
      })
    } catch {
      // Error handled globally
    }
  }

  const handleDueDateChange = async (date: Date | undefined) => {
    if (!task) return
    try {
      await updateTask(task.id, {
        dueDate: date ? format(date, 'yyyy-MM-dd') : null,
      })
    } catch {
      // Error handled globally
    }
  }

  const handleRecurrenceChange = async (rule: RecurrenceRule | null) => {
    if (!task) return
    try {
      await updateTask(task.id, { recurrenceRule: rule })
    } catch {
      // Error handled globally
    }
  }

  const handleReminderChange = async (time: string | null) => {
    if (!task) return
    try {
      await updateTask(task.id, { reminderTime: time })
    } catch {
      // Error handled globally
    }
  }

  const handleDelete = async () => {
    if (!task) return
    try {
      await deleteTask(task.id)
      dispatch({ type: 'SELECT_TASK', payload: null })
    } catch {
      // Error handled globally
    }
  }

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <ClipboardList className="size-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-medium text-muted-foreground/50">选择一个任务查看详情</p>
          <p className="mt-1 text-xs text-muted-foreground/40">或按 Cmd+N 创建新任务</p>
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
            placeholder="任务标题"
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                aria-label="删除任务"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除任务「{task.title}」吗？此操作不可撤销，子任务也会一并删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Status badge */}
        {task.status === 'completed' && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" />
            已完成
            {task.completedAt && (
              <span className="text-muted-foreground">
                · {format(parseISO(task.completedAt), 'M月d日', { locale: zhCN })}
              </span>
            )}
          </Badge>
        )}

        {/* Description (always visible, part of core editing experience) */}
        <Textarea
          value={description}
          onChange={handleDescriptionChange}
          placeholder="添加备注..."
          className="min-h-[80px] resize-none border-muted/60 text-sm focus:border-primary/30 transition-colors"
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
                          {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">优先级</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>优先级</TooltipContent>
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
                      {p === 'none' ? '无' : p === 'low' ? '低' : p === 'medium' ? '中' : '高'}
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
                <TooltipContent>截止日期</TooltipContent>
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
                      清除日期
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
                <TooltipContent>分类</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-44 p-1" align="start">
                <button
                  onClick={() => handleCategoryChange('none')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors',
                    !task.categoryId && 'bg-accent font-medium'
                  )}
                >
                  无分类
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
            <span>子任务</span>
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
          <p>创建于 {format(parseISO(task.createdAt), 'yyyy年M月d日 HH:mm', { locale: zhCN })}</p>
          <p>更新于 {format(parseISO(task.updatedAt), 'yyyy年M月d日 HH:mm', { locale: zhCN })}</p>
        </div>
      </div>
    </ScrollArea>
  )
}
