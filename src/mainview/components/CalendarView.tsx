import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/stores/ui-store'
import { useTasksQuery } from '@/hooks/useDataQueries'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getPriorityBadgeClasses,
  getPriorityLabel,
  getPriorityStripeColor,
} from '@/utils/priority'
import type { Task } from '@shared/types'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================

interface DayCell {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  tasks: Task[]
}

// ============================================================
// Helper: Group tasks by date
// ============================================================

function groupTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.dueDate) {
      const key = task.dueDate.slice(0, 10) // YYYY-MM-DD
      const arr = map.get(key) ?? []
      arr.push(task)
      map.set(key, arr)
    }
  }
  return map
}

// ============================================================
// CalendarGrid — Month view
// ============================================================

function CalendarGrid({
  currentMonth,
  tasksByDate,
  selectedDate,
  onSelectDate,
}: {
  currentMonth: Date
  tasksByDate: Map<string, Task[]>
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const weekdayLabels = t('calendar.weekdays', { returnObjects: true }) as string[]
  const days = useMemo((): DayCell[] => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: calStart, end: calEnd }).map((date) => ({
      date,
      isCurrentMonth: isSameMonth(date, currentMonth),
      isToday: isToday(date),
      tasks: tasksByDate.get(format(date, 'yyyy-MM-dd')) ?? [],
    }))
  }, [currentMonth, tasksByDate])

  return (
    <div className="select-none">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-medium text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
        {days.map((day) => {
          const dateKey = format(day.date, 'yyyy-MM-dd')
          const isSelected = selectedDate && isSameDay(day.date, selectedDate)
          const hasHighPriority = day.tasks.some((t) => t.priority === 'high')
          const hasOverdue = day.tasks.some(
            (t) =>
              t.status === 'todo' &&
              t.dueDate &&
              new Date(t.dueDate) < new Date(new Date().toDateString())
          )

          return (
            <TooltipProvider key={dateKey} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectDate(day.date)}
                    className={cn(
                      'relative flex flex-col items-center py-1.5 px-1 min-h-[72px] bg-background',
                      'transition-colors hover:bg-accent/50',
                      !day.isCurrentMonth && 'opacity-30',
                      isSelected && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
                      day.isToday && 'bg-accent/30'
                    )}
                  >
                    {/* Date number */}
                    <span
                      className={cn(
                        'text-[12px] leading-none font-medium mb-1',
                        day.isToday &&
                          'bg-primary text-primary-foreground rounded-full size-5 flex items-center justify-center',
                        !day.isCurrentMonth && 'text-muted-foreground'
                      )}
                    >
                      {format(day.date, 'd')}
                    </span>

                    {/* Task dots / indicators */}
                    {day.tasks.length > 0 && (
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        {day.tasks.length <= 3 ? (
                          day.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={cn(
                                'w-full max-w-[48px] h-1.5 rounded-sm',
                                task.status === 'completed'
                                  ? 'bg-muted-foreground/30'
                                  : task.priority === 'high'
                                    ? 'bg-red-400'
                                    : task.priority === 'medium'
                                      ? 'bg-amber-400'
                                      : task.priority === 'low'
                                        ? 'bg-blue-400'
                                        : 'bg-primary/50'
                              )}
                            />
                          ))
                        ) : (
                          <>
                            <div
                              className={cn(
                                'w-full max-w-[48px] h-1.5 rounded-sm',
                                hasHighPriority ? 'bg-red-400' : 'bg-primary/50'
                              )}
                            />
                            <span className="text-[9px] text-muted-foreground font-medium">
                              +{day.tasks.length - 1}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Overdue indicator */}
                    {hasOverdue && (
                      <div className="absolute top-1 right-1">
                        <AlertCircle className="size-2.5 text-destructive" />
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                {day.tasks.length > 0 && (
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="font-medium text-xs mb-1">
                      {format(day.date, 'M月d日 EEEE', { locale: zhCN })}
                    </p>
                    <ul className="space-y-0.5">
                      {day.tasks.slice(0, 5).map((task) => (
                        <li key={task.id} className="text-xs truncate">
                          {task.priority !== 'none' && (
                            <span
                              className={cn(
                                'inline-block size-1.5 rounded-full mr-1',
                                getPriorityStripeColor(task.priority)
                              )}
                            />
                          )}
                          {task.title}
                        </li>
                      ))}
                      {day.tasks.length > 5 && (
                        <li className="text-xs text-muted-foreground">
                          {t('calendar.moreTasks', { count: day.tasks.length - 5 })}
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// DayDetail — shows tasks for the selected day
// ============================================================

function DayDetail({
  date,
  tasks,
  onSelectTask,
}: {
  date: Date
  tasks: Task[]
  onSelectTask: (taskId: string) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const todoTasks = tasks.filter((tk) => tk.status === 'todo')
  const completedTasks = tasks.filter((tk) => tk.status === 'completed')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {format(date, 'M月d日 EEEE', { locale: zhCN })}
        </h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
          {t('calendar.taskCount', { count: tasks.length })}
        </Badge>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t('calendar.noTasks')}
        </p>
      ) : (
        <div className="space-y-1">
          {todoTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-2 rounded-md',
                'hover:bg-accent/60 transition-colors'
              )}
            >
              {/* Priority stripe */}
              {task.priority !== 'none' && (
                <div
                  className={cn(
                    'w-[3px] h-6 rounded-full shrink-0',
                    getPriorityStripeColor(task.priority)
                  )}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{task.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {task.priority !== 'none' && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[9px] px-1 py-0 h-3.5 border-0',
                        getPriorityBadgeClasses(task.priority)
                      )}
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {task.tags.slice(0, 2).map((tag) => (
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
            </button>
          ))}

          {completedTasks.length > 0 && (
            <>
              <div className="text-[11px] text-muted-foreground font-medium px-3 pt-2">
                {t('calendar.completedCount', { count: completedTasks.length })}
              </div>
              {completedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className={cn(
                    'w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md',
                    'hover:bg-accent/60 transition-colors'
                  )}
                >
                  <p className="text-[12px] truncate text-muted-foreground line-through">
                    {task.title}
                  </p>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CalendarView (main export)
// ============================================================

export function CalendarView(): React.JSX.Element {
  const { t } = useTranslation()
  const setFilterView = useUIStore((s) => s.setFilterView)
  const selectTask = useUIStore((s) => s.selectTask)
  const { data: tasks = [] } = useTasksQuery()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  // Group all tasks that have a due date
  const tasksByDate = useMemo(
    () => groupTasksByDate(tasks),
    [tasks]
  )

  // Tasks for the selected day
  const selectedDayTasks = useMemo((): Task[] => {
    if (!selectedDate) return []
    const key = format(selectedDate, 'yyyy-MM-dd')
    return tasksByDate.get(key) ?? []
  }, [selectedDate, tasksByDate])

  // Summary stats for the current month
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    let total = 0
    let completed = 0
    let overdue = 0

    for (const [dateStr, tasks] of tasksByDate) {
      const d = parseISO(dateStr)
      if (d >= monthStart && d <= monthEnd) {
        total += tasks.length
        completed += tasks.filter((t) => t.status === 'completed').length
        overdue += tasks.filter(
          (t) =>
            t.status === 'todo' &&
            new Date(dateStr) < new Date(new Date().toDateString())
        ).length
      }
    }

    return { total, completed, overdue }
  }, [currentMonth, tasksByDate])

  const handlePrevMonth = useCallback((): void => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }, [])

  const handleNextMonth = useCallback((): void => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }, [])

  const handleToday = useCallback((): void => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }, [])

  const handleSelectTask = useCallback(
    (taskId: string): void => {
      // Switch to all view and select the task
      setFilterView('all')
      selectTask(taskId)
    },
    [setFilterView, selectTask]
  )

  return (
    <div className="flex h-full flex-col p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-muted-foreground">
              {t('calendar.monthTotal', { count: monthStats.total })}
            </span>
            {monthStats.completed > 0 && (
              <span className="text-[11px] text-green-600">
                {t('calendar.monthCompleted', { count: monthStats.completed })}
              </span>
            )}
            {monthStats.overdue > 0 && (
              <span className="text-[11px] text-destructive">
                {t('calendar.monthOverdue', { count: monthStats.overdue })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-xs h-7 px-2.5"
          >
            {t('calendar.today')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handlePrevMonth}
            aria-label={t('calendar.previousMonth')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleNextMonth}
            aria-label={t('calendar.nextMonth')}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Calendar + Day Detail layout */}
      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          <CalendarGrid
            currentMonth={currentMonth}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Day Detail Sidebar */}
        {selectedDate && (
          <div className="w-[260px] shrink-0 border-l border-border/60 pl-5">
            <ScrollArea className="h-full">
              <DayDetail
                date={selectedDate}
                tasks={selectedDayTasks}
                onSelectTask={handleSelectTask}
              />
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
