import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import {
  useCreateSubTask,
  useUpdateSubTask,
  useDeleteSubTask,
} from '@/hooks/useDataQueries'
import { Plus, CheckCircle2 } from 'lucide-react'
import type { Task } from '@shared/types'
import { SubTaskItem } from './SubTaskItem'

export function SubTaskList({ task }: { task: Task }): React.JSX.Element {
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
