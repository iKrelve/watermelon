import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  getPriorityLabel,
  getPriorityBadgeClasses,
  getPriorityStripeColor,
} from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubTask } from '@shared/types'

export function SubTaskRow({
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
