import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { useCreateTask } from '@/hooks/useDataQueries'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AddTaskBar(): React.JSX.Element | null {
  const [title, setTitle] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const filterView = useUIStore((s) => s.filterView)
  const filterCategoryId = useUIStore((s) => s.filterCategoryId)
  const selectTask = useUIStore((s) => s.selectTask)
  const createTaskMut = useCreateTask()

  const handleSubmit = async (): Promise<void> => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const task = await createTaskMut.mutateAsync({
        title: trimmed,
        categoryId:
          filterView === 'category' && filterCategoryId
            ? filterCategoryId
            : undefined,
      })
      setTitle('')
      // Auto-select the newly created task so user can immediately edit details
      selectTask(task.id)
      inputRef.current?.focus()
    } catch {
      // Will be handled by error handler
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setTitle('')
      inputRef.current?.blur()
    }
  }

  // Don't show AddTaskBar in completed view
  if (filterView === 'completed') return null

  return (
    <div
      className={cn(
        'border-b border-border/60 px-4 py-2.5 transition-colors duration-150',
        isFocused ? 'bg-accent/30' : 'bg-transparent'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex size-5 items-center justify-center rounded-full shrink-0 transition-colors duration-150',
            isFocused
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/10 text-primary'
          )}
        >
          <Plus className="size-3" />
        </div>
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="添加新任务，按 Enter 确认"
          data-shortcut-target="add-task"
          className="h-8 border-none shadow-none focus-visible:ring-0 px-0 text-[13px] placeholder:text-muted-foreground/50"
          disabled={isSubmitting}
        />
        {title.trim() && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground hover:text-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="添加任务"
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
