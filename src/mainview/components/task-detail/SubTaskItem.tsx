import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  CalendarDays,
  Flag,
  X,
  ClipboardList,
  ChevronRight,
  ChevronDown,
  Plus,
  ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getPriorityColor,
  getPriorityBadgeClasses,
  getPriorityStripeColor,
  getPriorityLabel,
} from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { SubTask as SubTaskType, Priority } from '@shared/types'
import { useDebouncedCallback } from './useDebouncedCallback'

export function SubTaskItem({
  subTask,
  taskId,
  depth = 0,
  onToggle,
  onUpdate,
  onDelete,
  onCreateChild,
}: {
  subTask: SubTaskType
  taskId: string
  depth?: number
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
  onCreateChild: (parentId: string, title: string) => Promise<void>
}): React.JSX.Element {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [description, setDescription] = useState(subTask.description ?? '')
  const [dueDateOpen, setDueDateOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(subTask.title)
  const [newChildTitle, setNewChildTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const childInputRef = useRef<HTMLInputElement>(null)

  const children = subTask.children ?? []
  const childCount = children.length
  const completedChildCount = children.filter((c) => c.completed).length

  // Sync local title when subTask changes externally
  useEffect(() => {
    setTitleValue(subTask.title)
  }, [subTask.title])

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

  const handleAddChild = async (): Promise<void> => {
    const trimmed = newChildTitle.trim()
    if (!trimmed) return
    await onCreateChild(subTask.id, trimmed)
    setNewChildTitle('')
    childInputRef.current?.focus()
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
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              setEditingTitle(false)
              const trimmed = titleValue.trim()
              if (trimmed && trimmed !== subTask.title) {
                onUpdate(subTask.id, { title: trimmed })
              } else {
                setTitleValue(subTask.title)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
              if (e.key === 'Escape') {
                setTitleValue(subTask.title)
                setEditingTitle(false)
              }
            }}
            className={cn(
              'flex-1 min-w-0 bg-transparent text-sm outline-none border-none',
              'ring-1 ring-primary/30 rounded px-1 -mx-1',
              subTask.completed && 'line-through text-muted-foreground'
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingTitle(true)
              setTimeout(() => titleInputRef.current?.focus(), 0)
            }}
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
                {childCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                    <ListChecks className="size-3" />
                    {completedChildCount}/{childCount}
                  </span>
                )}
              </>
            )}
          </button>
        )}

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

          {/* Nested children */}
          {childCount > 0 && (
            <div className="space-y-0.5 border-l-2 border-border/40 pl-2 ml-0.5">
              {children.map((child) => (
                <SubTaskItem
                  key={child.id}
                  subTask={child}
                  taskId={taskId}
                  depth={depth + 1}
                  onToggle={onToggle}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onCreateChild={onCreateChild}
                />
              ))}
            </div>
          )}

          {/* Add child sub-task */}
          <div className="flex items-center gap-1.5 pl-0.5">
            <Plus className="size-3 text-muted-foreground shrink-0" />
            <Input
              ref={childInputRef}
              value={newChildTitle}
              onChange={(e) => setNewChildTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddChild()
                }
              }}
              placeholder={t('taskDetail.addSubtaskPlaceholder')}
              className="h-6 border-none shadow-none focus-visible:ring-0 px-0 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}
