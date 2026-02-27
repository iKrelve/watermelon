import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  getPriorityLabel,
  getPriorityBadgeClasses,
  getPriorityStripeColor,
} from '@/utils/priority'
import { isOverdue } from '@/utils/date-filters'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task, SubTask } from '@shared/types'
import {
  CalendarDays,
  AlertCircle,
  Repeat,
  ListChecks,
  ChevronRight,
  ChevronDown,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubTaskRow } from './SubTaskRow'

export function TaskItemContent({
  task,
  isSelected,
  isMultiSelected,
  isDragging,
  handleSelect,
  handleComplete,
  toggleExpand,
  expanded,
  subTasks,
  handleToggleSubTask,
  dragHandleProps,
}: {
  task: Task
  isSelected: boolean
  isMultiSelected?: boolean
  isDragging?: boolean
  handleSelect: (e: React.MouseEvent) => void
  handleComplete: (checked: boolean | 'indeterminate') => void
  toggleExpand: (e: React.MouseEvent) => void
  expanded: boolean
  subTasks: SubTask[]
  handleToggleSubTask: (id: string, completed: boolean) => void
  dragHandleProps?: Record<string, unknown>
}): React.JSX.Element {
  const { t } = useTranslation()
  const overdue = isOverdue(task)
  const isCompleted = task.status === 'completed'
  const subTaskCount = subTasks.length
  const completedSubTasks = subTasks.filter((s) => s.completed).length

  const formattedDueDate = task.dueDate
    ? format(parseISO(task.dueDate), 'M月d日', { locale: zhCN })
    : null

  const ariaLabel = `${t('task.ariaLabel', { title: task.title })}${isCompleted ? t('task.completedSuffix') : ''}${overdue ? t('task.overdueSuffix') : ''}`

  return (
    <div className={cn('animate-list-enter', isDragging && 'opacity-50')}>
      {/* Main task row */}
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        onClick={handleSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSelect(e as unknown as React.MouseEvent)
          }
        }}
        className={cn(
          'group relative flex items-center gap-3 px-4 py-3 cursor-pointer',
          'rounded-lg mx-1.5 my-0.5',
          'transition-all duration-150',
          'hover:bg-accent/60',
          isSelected && 'bg-accent shadow-sm',
          isMultiSelected && 'bg-primary/10 ring-1 ring-inset ring-primary/30',
          overdue && !isCompleted && 'ring-1 ring-inset ring-destructive/20 bg-destructive/5'
        )}
      >
        {/* Drag handle */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors -ml-1 mr-0"
          >
            <GripVertical className="size-4" />
          </div>
        )}

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
            aria-label={isCompleted ? t('task.markIncomplete') : t('task.markComplete')}
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

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1">
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
                {overdue && !isCompleted && ` ${t('task.overdue')}`}
              </span>
            )}

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

            {subTaskCount > 0 && (
              <button
                type="button"
                onClick={toggleExpand}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] text-muted-foreground',
                  'hover:text-foreground transition-colors rounded px-1 -ml-1',
                  expanded && 'text-foreground'
                )}
                aria-label={expanded ? t('task.collapseSubtasks') : t('task.expandSubtasks')}
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

            {task.recurrenceRule && (
              <Repeat className="size-3 text-muted-foreground" />
            )}

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
