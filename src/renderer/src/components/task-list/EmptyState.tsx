import { Button } from '@/components/ui/button'
import {
  Inbox,
  Sun,
  CalendarRange,
  CheckCircle2,
  FolderOpen,
  Tag,
  ClipboardList,
  Plus,
} from 'lucide-react'

const EMPTY_STATE_CONFIG: Record<
  string,
  { icon: React.ReactNode; text: string; hint?: string; showAddButton?: boolean }
> = {
  all: {
    icon: <Inbox className="size-10 text-muted-foreground/30" />,
    text: '任务列表是空的',
    hint: '在上方输入框中创建你的第一个任务',
    showAddButton: true,
  },
  today: {
    icon: <Sun className="size-10 text-muted-foreground/30" />,
    text: '今天没有待办任务',
    hint: '享受轻松的一天吧',
  },
  upcoming: {
    icon: <CalendarRange className="size-10 text-muted-foreground/30" />,
    text: '未来 7 天没有安排',
  },
  completed: {
    icon: <CheckCircle2 className="size-10 text-muted-foreground/30" />,
    text: '还没有已完成的任务',
  },
  category: {
    icon: <FolderOpen className="size-10 text-muted-foreground/30" />,
    text: '该分类下没有任务',
    hint: '在上方输入框中添加任务到该分类',
    showAddButton: true,
  },
  tag: {
    icon: <Tag className="size-10 text-muted-foreground/30" />,
    text: '该标签下没有任务',
  },
}

export function EmptyState({
  filterView,
  onAddTask,
}: {
  filterView: string
  onAddTask?: () => void
}): React.JSX.Element {
  const config = EMPTY_STATE_CONFIG[filterView] ?? {
    icon: <ClipboardList className="size-10 text-muted-foreground/30" />,
    text: '没有找到匹配的任务',
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="mb-4">{config.icon}</div>
      <p className="text-sm font-medium text-muted-foreground/70">{config.text}</p>
      {config.hint && (
        <p className="mt-1.5 text-xs text-muted-foreground/50">{config.hint}</p>
      )}
      {config.showAddButton && onAddTask && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 text-xs"
          onClick={onAddTask}
        >
          <Plus className="size-3.5" />
          创建任务
        </Button>
      )}
      <p className="text-[11px] mt-3 text-muted-foreground/30">Cmd+N 快速创建</p>
    </div>
  )
}
