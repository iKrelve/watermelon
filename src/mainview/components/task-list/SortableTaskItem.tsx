import { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCompleteTask, useUncompleteTask, useUpdateSubTask } from '@/hooks/useDataQueries'
import type { Task } from '@shared/types'
import { TaskItemContent } from './TaskItemContent'

export function SortableTaskItem({
  task,
  isSelected,
  isMultiSelected,
  onSelect,
}: {
  task: Task
  isSelected: boolean
  isMultiSelected: boolean
  onSelect: (taskId: string, e: React.MouseEvent) => void
}): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const completeTaskMut = useCompleteTask()
  const uncompleteTaskMut = useUncompleteTask()
  const updateSubTaskMut = useUpdateSubTask()
  const subTasks = task.subTasks ?? []
  const subTaskCount = subTasks.length
  const [expanded, setExpanded] = useState(subTaskCount > 0)

  const handleSelect = useCallback(
    (e: React.MouseEvent): void => {
      onSelect(task.id, e)
    },
    [task.id, onSelect]
  )

  const handleComplete = async (checked: boolean | 'indeterminate'): Promise<void> => {
    try {
      if (checked === true && task.status !== 'completed') {
        await completeTaskMut.mutateAsync(task.id)
      } else if (checked === false && task.status === 'completed') {
        await uncompleteTaskMut.mutateAsync(task.id)
      }
    } catch {
      // Will be handled by error handler
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskItemContent
        task={task}
        isSelected={isSelected}
        isMultiSelected={isMultiSelected}
        isDragging={isDragging}
        handleSelect={handleSelect}
        handleComplete={handleComplete}
        toggleExpand={toggleExpand}
        expanded={expanded}
        subTasks={subTasks}
        handleToggleSubTask={handleToggleSubTask}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
