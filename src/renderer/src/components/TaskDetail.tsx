import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/RichTextEditor'
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
import { useUIStore } from '@/stores/ui-store'
import {
  useTasksQuery,
  useCategoriesQuery,
  useTagsQuery,
  useUpdateTask,
  useDeleteTask,
  useCreateSubTask,
  useUpdateSubTask,
  useDeleteSubTask,
  useCreateTag,
  useAddTagToTask,
  useRemoveTagFromTask,
} from '@/hooks/useDataQueries'
import {
  getPriorityColor,
  getPriorityBadgeClasses,
  getPriorityStripeColor,
  getPriorityLabel,
} from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task, SubTask as SubTaskType, Priority, RecurrenceRule, RecurrenceType } from '../../../shared/types'
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
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Debounced update hook
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

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
// SubTaskItem component — expandable row with priority, description, due date
// ============================================================

function SubTaskItem({
  subTask,
  onToggle,
  onUpdate,
  onDelete,
}: {
  subTask: SubTaskType
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [description, setDescription] = useState(subTask.description ?? '')
  const [dueDateOpen, setDueDateOpen] = useState(false)

  // Sync local description when subTask changes externally
  useEffect(() => {
    setDescription(subTask.description ?? '')
  }, [subTask.description])

  const debouncedUpdateDescription = useDebouncedCallback(
    (value: string) => {
      onUpdate(subTask.id, { description: value || null })
    },
    500
  )

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value
    setDescription(val)
    debouncedUpdateDescription(val)
  }

  const handlePriorityChange = (priority: Priority): void => {
    onUpdate(subTask.id, { priority })
  }

  const handleDueDateChange = (date: Date | undefined): void => {
    onUpdate(subTask.id, { dueDate: date ? format(date, 'yyyy-MM-dd') : null })
    setDueDateOpen(false)
  }

  const formattedDueDate = subTask.dueDate
    ? format(parseISO(subTask.dueDate), 'M月d日', { locale: zhCN })
    : null

  const isOverdue =
    subTask.dueDate && !subTask.completed && new Date(subTask.dueDate) < new Date(new Date().toDateString())

  return (
    <div className="rounded-md overflow-hidden">
      {/* Main row */}
      <div
        className={cn(
          'group relative flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 transition-colors',
          expanded && 'bg-accent/30'
        )}
      >
        {/* Priority stripe */}
        {subTask.priority !== 'none' && (
          <div
            className={cn(
              'absolute left-0 top-1 bottom-1 w-[2px] rounded-full',
              getPriorityStripeColor(subTask.priority)
            )}
          />
        )}

        <Checkbox
          checked={subTask.completed}
          onCheckedChange={(checked) => onToggle(subTask.id, checked === true)}
          className={cn(
            'size-3.5 rounded-full transition-colors',
            subTask.priority === 'high' &&
              'border-red-400 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500',
            subTask.priority === 'medium' &&
              'border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500',
            subTask.priority === 'low' &&
              'border-blue-400 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500'
          )}
        />

        {/* Title + meta indicators */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 flex items-center gap-1.5 text-left"
        >
          <span
            className={cn(
              'text-sm truncate',
              subTask.completed && 'line-through text-muted-foreground'
            )}
          >
            {subTask.title}
          </span>

          {/* Inline indicators when collapsed */}
          {!expanded && (
            <>
              {subTask.priority !== 'none' && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[9px] px-1 py-0 h-3.5 border-0 font-medium shrink-0',
                    getPriorityBadgeClasses(subTask.priority)
                  )}
                >
                  {getPriorityLabel(subTask.priority)}
                </Badge>
              )}
              {formattedDueDate && (
                <span
                  className={cn(
                    'text-[10px] shrink-0',
                    isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}
                >
                  {formattedDueDate}
                </span>
              )}
              {subTask.description && (
                <ClipboardList className="size-3 text-muted-foreground/50 shrink-0" />
              )}
            </>
          )}
        </button>

        {/* Expand / collapse chevron */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label={expanded ? t('taskDetail.collapseDetail') : t('taskDetail.expandDetail')}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Delete button */}
        <button
          aria-label={t('taskDetail.deleteSubtask', { title: subTask.title })}
          onClick={() => onDelete(subTask.id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="size-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="pl-8 pr-2 pb-2 space-y-2 animate-in slide-in-from-top-1 duration-150">
          {/* Priority & Due Date row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={subTask.priority !== 'none' ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn(
                    'h-6 gap-1 text-[11px] px-2',
                    subTask.priority !== 'none'
                      ? getPriorityBadgeClasses(subTask.priority)
                      : 'font-normal'
                  )}
                >
                  <Flag
                    className={cn(
                      'size-3',
                      subTask.priority === 'none'
                        ? 'text-muted-foreground'
                        : 'currentColor'
                    )}
                  />
                  {subTask.priority !== 'none'
                    ? getPriorityLabel(subTask.priority)
                    : t('priority.label')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="start">
                {(['none', 'low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent transition-colors',
                      subTask.priority === p && 'bg-accent font-medium'
                    )}
                  >
                    <Flag className={cn('size-3', getPriorityColor(p))} />
                    <span className="flex-1">
                      {p === 'none' ? t('priority.none') : getPriorityLabel(p)}
                    </span>
                    {p !== 'none' && (
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
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

            {/* Due date selector */}
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-6 gap-1 text-[11px] px-2 font-normal',
                    subTask.dueDate && 'border-primary/40 text-primary',
                    isOverdue && 'border-destructive/40 text-destructive'
                  )}
                >
                  <CalendarDays className="size-3" />
                  {formattedDueDate ?? t('taskDetail.dueDateLabel')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={subTask.dueDate ? parseISO(subTask.dueDate) : undefined}
                  onSelect={handleDueDateChange}
                  locale={zhCN}
                />
                {subTask.dueDate && (
                  <div className="border-t px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-full text-xs text-muted-foreground"
                      onClick={() => handleDueDateChange(undefined)}
                    >
                      <X className="size-3 mr-1" />
                      {t('taskDetail.clearDate')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <Textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder={t('taskDetail.descriptionPlaceholder')}
            className="min-h-[60px] text-xs resize-none border-dashed"
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// SubTaskList component
// ============================================================

function SubTaskList({ task }: { task: Task }): React.JSX.Element {
  const { t } = useTranslation()
  const createSubTaskMut = useCreateSubTask()
  const updateSubTaskMut = useUpdateSubTask()
  const deleteSubTaskMut = useDeleteSubTask()
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const subTasks = task.subTasks ?? []
  const completedCount = subTasks.filter((s) => s.completed).length

  const handleAddSubTask = async (): Promise<void> => {
    const trimmed = newSubTaskTitle.trim()
    if (!trimmed) return

    try {
      await createSubTaskMut.mutateAsync({ taskId: task.id, data: { title: trimmed } })
      setNewSubTaskTitle('')
      inputRef.current?.focus()
    } catch {
      // Error handled by global handler
    }
  }

  const handleToggleSubTask = async (subTaskId: string, completed: boolean): Promise<void> => {
    try {
      await updateSubTaskMut.mutateAsync({ id: subTaskId, data: { completed } })
    } catch {
      // Error handled by global handler
    }
  }

  const handleUpdateSubTask = async (
    subTaskId: string,
    data: Record<string, unknown>
  ): Promise<void> => {
    try {
      await updateSubTaskMut.mutateAsync({ id: subTaskId, data })
    } catch {
      // Error handled by global handler
    }
  }

  const handleDeleteSubTask = async (subTaskId: string): Promise<void> => {
    try {
      await deleteSubTaskMut.mutateAsync(subTaskId)
    } catch {
      // Error handled by global handler
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('taskDetail.subtasksLabel')}
        </h4>
        {subTasks.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{subTasks.length}
          </span>
        )}
      </div>

      {/* Sub-task items */}
      <div className="space-y-0.5">
        {subTasks.map((subTask) => (
          <SubTaskItem
            key={subTask.id}
            subTask={subTask}
            onToggle={handleToggleSubTask}
            onUpdate={handleUpdateSubTask}
            onDelete={handleDeleteSubTask}
          />
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
          placeholder={t('taskDetail.addSubtaskPlaceholder')}
          className="h-7 border-none shadow-none focus-visible:ring-0 px-0 text-sm"
        />
      </div>

      {/* All complete indicator */}
      {subTasks.length > 0 && completedCount === subTasks.length && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" />
          {t('taskDetail.allSubtasksDone')}
        </div>
      )}
    </div>
  )
}

// ============================================================
// RecurrenceSettings component
// ============================================================

const RECURRENCE_TYPE_KEYS: Record<RecurrenceType, string> = {
  daily: 'recurrence.daily',
  weekly: 'recurrence.weekly',
  monthly: 'recurrence.monthly',
  custom: 'recurrence.custom',
}

function RecurrenceSettings({
  recurrenceRule,
  onChange,
}: {
  recurrenceRule: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const weekdayLabels = t('calendar.weekdays', { returnObjects: true }) as string[]
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
                ? `${t(RECURRENCE_TYPE_KEYS[recurrenceRule.type])}${
                    recurrenceRule.interval > 1 ? ` ×${recurrenceRule.interval}` : ''
                  }`
                : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('recurrence.tooltip')}</TooltipContent>
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
              <SelectItem value="none">{t('recurrence.none')}</SelectItem>
              <SelectItem value="daily">{t('recurrence.daily')}</SelectItem>
              <SelectItem value="weekly">{t('recurrence.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('recurrence.monthly')}</SelectItem>
              <SelectItem value="custom">{t('recurrence.custom')}</SelectItem>
            </SelectContent>
          </Select>

          {recurrenceRule && (
            <>
              {/* Interval */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t('recurrence.every')}</span>
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
                    ? t('recurrence.dayUnit')
                    : recurrenceRule.type === 'weekly'
                      ? t('recurrence.weekUnit')
                      : recurrenceRule.type === 'monthly'
                        ? t('recurrence.monthUnit')
                        : t('recurrence.timesUnit')}
                </span>
              </div>

              {/* Weekly - day selector */}
              {recurrenceRule.type === 'weekly' && (
                <div className="flex gap-1">
                  {weekdayLabels.map((label, index) => (
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
                  <span className="text-xs text-muted-foreground">{t('recurrence.monthDay')}</span>
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
                  <span className="text-xs text-muted-foreground">{t('recurrence.monthDaySuffix')}</span>
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
  const { t } = useTranslation()
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
        <TooltipContent>{t('reminder.tooltip')}</TooltipContent>
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
                {t('reminder.clear')}
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
  const { t } = useTranslation()
  const { data: allTags = [] } = useTagsQuery()
  const addTagToTaskMut = useAddTagToTask()
  const removeTagFromTaskMut = useRemoveTagFromTask()
  const createTagMut = useCreateTag()
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const taskTagIds = (task.tags ?? []).map((t) => t.id)
  const availableTags = allTags.filter((t) => !taskTagIds.includes(t.id))

  const handleAddTag = async (tagId: string): Promise<void> => {
    try {
      await addTagToTaskMut.mutateAsync({ taskId: task.id, tagId })
    } catch {
      // Error handled globally
    }
  }

  const handleRemoveTag = async (tagId: string): Promise<void> => {
    try {
      await removeTagFromTaskMut.mutateAsync({ taskId: task.id, tagId })
    } catch {
      // Error handled globally
    }
  }

  const handleCreateAndAdd = async (): Promise<void> => {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    try {
      const tag = await createTagMut.mutateAsync({ name: trimmed })
      await addTagToTaskMut.mutateAsync({ taskId: task.id, tagId: tag.id })
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
        <TooltipContent>{t('taskDetail.tagsLabel')}</TooltipContent>
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
              placeholder={t('taskDetail.newTagPlaceholder')}
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

  // Sync local state when the selected task changes or its persisted
  // title/description are updated from elsewhere (e.g. another window).
  useEffect(() => {
    if (taskId != null) {
      setTitle(taskTitle ?? '')
      setDescription(taskDescription ?? '')
    }
  }, [taskId, taskTitle, taskDescription])

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
