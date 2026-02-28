import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  getPriorityLabel,
  getPriorityBadgeClasses,
  getPriorityStripeColor,
} from '@/utils/priority'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AlertCircle, ChevronRight, ChevronDown, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import type { SubTask } from '@shared/types'

export function SubTaskRow({
  subTask,
  onToggle,
  depth = 0,
  parentTaskId,
}: {
  subTask: SubTask
  onToggle: (id: string, completed: boolean) => void
  depth?: number
  parentTaskId?: string
}): React.JSX.Element {
  const selectTask = useUIStore((s) => s.selectTask)
  const compactMode = useUIStore((s) => s.compactMode)
  const children = subTask.children ?? []
  const [childrenExpanded, setChildrenExpanded] = useState(compactMode && children.length > 0)

  const formattedDueDate = subTask.dueDate
    ? format(parseISO(subTask.dueDate), 'M月d日', { locale: zhCN })
    : null

  const isOverdueSubTask =
    subTask.dueDate &&
    !subTask.completed &&
    new Date(subTask.dueDate) < new Date(new Date().toDateString())

  const childCount = children.length
  const completedChildCount = children.filter((c) => c.completed).length

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => parentTaskId && selectTask(parentTaskId)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && parentTaskId) {
            e.preventDefault()
            selectTask(parentTaskId)
          }
        }}
        className={cn(
          'relative flex items-start gap-2 py-1 pl-2 pr-1 cursor-pointer',
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

        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
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
            {childCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setChildrenExpanded(!childrenExpanded)
                }}
                className={cn(
                  'inline-flex items-center gap-0.5 text-[10px] text-muted-foreground',
                  'hover:text-foreground transition-colors shrink-0'
                )}
              >
                {childrenExpanded ? (
                  <ChevronDown className="size-2.5" />
                ) : (
                  <ChevronRight className="size-2.5" />
                )}
                <ListChecks className="size-2.5" />
                {completedChildCount}/{childCount}
              </button>
            )}
          </div>

          {/* Description preview (compact mode only) */}
          {compactMode && subTask.description && (
            <p className="text-[10px] leading-snug text-muted-foreground/70 truncate mt-0.5">
              {subTask.description}
            </p>
          )}
        </div>
      </div>

      {/* Expanded children */}
      {childrenExpanded && childCount > 0 && (
        <div
          className="ml-4 border-l-2 border-border/40 pl-1.5 space-y-0.5 animate-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {children.map((child) => (
            <SubTaskRow
              key={child.id}
              subTask={child}
              onToggle={onToggle}
              depth={depth + 1}
              parentTaskId={parentTaskId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
