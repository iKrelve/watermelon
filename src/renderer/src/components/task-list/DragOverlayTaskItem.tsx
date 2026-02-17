import { Badge } from '@/components/ui/badge'
import {
  getPriorityBadgeClasses,
  getPriorityLabel,
  getPriorityStripeColor,
} from '@/utils/priority'
import { isOverdue } from '@/utils/date-filters'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Task } from '../../../../shared/types'
import { CalendarDays, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DragOverlayTaskItem({ task }: { task: Task }): React.JSX.Element {
  const overdue = isOverdue(task)
  const isCompleted = task.status === 'completed'
  const formattedDueDate = task.dueDate
    ? format(parseISO(task.dueDate), 'M月d日', { locale: zhCN })
    : null

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 px-4 py-3',
        'rounded-lg bg-background shadow-lg border border-border/80',
        'opacity-90 cursor-grabbing'
      )}
    >
      <GripVertical className="size-4 text-muted-foreground/60 shrink-0" />

      {/* Priority stripe */}
      {task.priority !== 'none' && (
        <div
          className={cn(
            'absolute left-0 top-2 bottom-2 w-[3px] rounded-full',
            getPriorityStripeColor(task.priority)
          )}
        />
      )}

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-[13px] leading-snug truncate',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </p>
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
              <CalendarDays className="size-3" />
              {formattedDueDate}
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
        </div>
      </div>
    </div>
  )
}
