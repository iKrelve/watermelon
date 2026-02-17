import { useState, useCallback } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useCompleteTask, useUpdateSubTask } from '@/hooks/useDataQueries'
import type { Task } from '../../../../shared/types'
import { TaskItemContent } from './TaskItemContent'

export function TaskItem({ task, isSelected }: { task: Task; isSelected: boolean }): React.JSX.Element {
  const selectTask = useUIStore((s) => s.selectTask)
  const completeTaskMut = useCompleteTask()
  const updateSubTaskMut = useUpdateSubTask()
  const subTasks = task.subTasks ?? []
  const subTaskCount = subTasks.length
  const [expanded, setExpanded] = useState(subTaskCount > 0)

  const handleSelect = (): void => {
    selectTask(task.id)
  }

  const handleComplete = async (checked: boolean | 'indeterminate'): Promise<void> => {
    if (checked === true && task.status !== 'completed') {
      try {
        await completeTaskMut.mutateAsync(task.id)
      } catch {
        // Will be handled by error handler
      }
    }
  }

  const handleToggleSubTask = useCallback(
    async (subTaskId: string, completed: boolean): Promise<void> => {
      try {
        await updateSubTaskMut.mutateAsync({ id: subTaskId, data: { completed } })
      } catch {
        // Error handled globally
      }
    },
    [updateSubTaskMut]
  )

  const toggleExpand = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      setExpanded((prev) => !prev)
    },
    []
  )

  return (
    <TaskItemContent
      task={task}
      isSelected={isSelected}
      handleSelect={handleSelect}
      handleComplete={handleComplete}
      toggleExpand={toggleExpand}
      expanded={expanded}
      subTasks={subTasks}
      handleToggleSubTask={handleToggleSubTask}
    />
  )
}
