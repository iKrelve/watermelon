import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tag, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useTagsQuery,
  useCreateTag,
  useAddTagToTask,
  useRemoveTagFromTask,
} from '@/hooks/useDataQueries'
import type { Task } from '@shared/types'

export function TagSelector({ task }: { task: Task }): React.JSX.Element {
  const { t } = useTranslation()
  const { data: allTags = [] } = useTagsQuery()
  const addTagToTaskMut = useAddTagToTask()
  const removeTagFromTaskMut = useRemoveTagFromTask()
  const createTagMut = useCreateTag()
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const taskTagIds = (task.tags ?? []).map((t) => t.id)
  const availableTags = allTags.filter((t) => !taskTagIds.includes(t.id))

  const handleAddTag = async (tagId: string): Promise<void> => {
    try {
      await addTagToTaskMut.mutateAsync({ taskId: task.id, tagId })
    } catch {
      // Error handled globally
    }
  }

  const handleRemoveTag = async (tagId: string): Promise<void> => {
    try {
      await removeTagFromTaskMut.mutateAsync({ taskId: task.id, tagId })
    } catch {
      // Error handled globally
    }
  }

  const handleCreateAndAdd = async (): Promise<void> => {
    const trimmed = newTagName.trim()
    if (!trimmed) return
    try {
      const tag = await createTagMut.mutateAsync({ name: trimmed })
      await addTagToTaskMut.mutateAsync({ taskId: task.id, tagId: tag.id })
      setNewTagName('')
    } catch {
      // Error handled globally
    }
  }

  const tagCount = task.tags?.length ?? 0

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1.5 text-xs font-normal',
                tagCount > 0 && 'border-primary/40 text-primary'
              )}
            >
              <Tag className="size-3.5" />
              {tagCount > 0 ? `${tagCount}` : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('taskDetail.tagsLabel')}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-2">
          {/* Current tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-1">
              {task.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1 text-xs pl-2 pr-1"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Available tags */}
          {availableTags.length > 0 && (
            <div className="space-y-0.5">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          <Separator />

          {/* Create new tag */}
          <div className="flex items-center gap-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreateAndAdd()
                }
              }}
              placeholder={t('taskDetail.newTagPlaceholder')}
              className="h-7 text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={handleCreateAndAdd}
              disabled={!newTagName.trim()}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
