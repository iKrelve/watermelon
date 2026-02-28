import { useTranslation } from 'react-i18next'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Trash2, Flag, CheckCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPriorityColor } from '@/utils/priority'
import type { Priority } from '@shared/types'

const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low', 'none']

export function TaskContextMenu({
  children,
  selectedIds,
  onBatchDelete,
  onBatchComplete,
  onBatchSetPriority,
  onClearSelection,
}: {
  children: React.ReactNode
  selectedIds: Set<string>
  onBatchDelete: () => void
  onBatchComplete: () => void
  onBatchSetPriority: (priority: Priority) => void
  onClearSelection: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const count = selectedIds.size

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {count > 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
            {t('contextMenu.selectedCount', { count })}
          </div>
        )}
        <ContextMenuItem onClick={onBatchComplete} disabled={count === 0}>
          <CheckCheck className="mr-2 size-4" />
          {t('contextMenu.batchComplete')}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={count === 0}>
            <Flag className="mr-2 size-4" />
            {t('contextMenu.setPriority')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36">
            {PRIORITY_OPTIONS.map((p) => (
              <ContextMenuItem
                key={p}
                onClick={() => onBatchSetPriority(p)}
              >
                <Flag className={cn('mr-2 size-4', getPriorityColor(p))} />
                {t(`priority.${p}`)}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onBatchDelete}
          disabled={count === 0}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          {t('contextMenu.batchDelete')}
        </ContextMenuItem>
        {count > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onClearSelection}>
              <X className="mr-2 size-4" />
              {t('contextMenu.clearSelection')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
