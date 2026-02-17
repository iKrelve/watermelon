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
import type { Priority } from '../../../../shared/types'

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: 'text-red-500' },
  { value: 'medium', label: '中', color: 'text-amber-500' },
  { value: 'low', label: '低', color: 'text-blue-500' },
  { value: 'none', label: '无', color: 'text-muted-foreground' },
]

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
  const count = selectedIds.size

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {count > 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
            已选择 {count} 个任务
          </div>
        )}
        <ContextMenuItem onClick={onBatchComplete} disabled={count === 0}>
          <CheckCheck className="mr-2 size-4" />
          批量完成
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={count === 0}>
            <Flag className="mr-2 size-4" />
            设置优先级
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36">
            {PRIORITY_OPTIONS.map((opt) => (
              <ContextMenuItem
                key={opt.value}
                onClick={() => onBatchSetPriority(opt.value)}
              >
                <Flag className={cn('mr-2 size-4', opt.color)} />
                {opt.label}
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
          批量删除
        </ContextMenuItem>
        {count > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onClearSelection}>
              <X className="mr-2 size-4" />
              取消选择
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
