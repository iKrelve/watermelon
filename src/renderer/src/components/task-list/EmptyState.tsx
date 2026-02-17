import { useTranslation } from 'react-i18next'
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

const EMPTY_STATE_ICONS: Record<string, React.ReactNode> = {
  all: <Inbox className="size-10 text-muted-foreground/30" />,
  today: <Sun className="size-10 text-muted-foreground/30" />,
  upcoming: <CalendarRange className="size-10 text-muted-foreground/30" />,
  completed: <CheckCircle2 className="size-10 text-muted-foreground/30" />,
  category: <FolderOpen className="size-10 text-muted-foreground/30" />,
  tag: <Tag className="size-10 text-muted-foreground/30" />,
}

const EMPTY_STATE_KEYS: Record<string, { title: string; hint?: string; showAddButton?: boolean }> = {
  all: { title: 'emptyState.allTitle', hint: 'emptyState.allHint', showAddButton: true },
  today: { title: 'emptyState.todayTitle', hint: 'emptyState.todayHint' },
  upcoming: { title: 'emptyState.upcomingTitle' },
  completed: { title: 'emptyState.completedTitle' },
  category: { title: 'emptyState.categoryTitle', hint: 'emptyState.categoryHint', showAddButton: true },
  tag: { title: 'emptyState.tagTitle' },
}

export function EmptyState({
  filterView,
  onAddTask,
}: {
  filterView: string
  onAddTask?: () => void
}): React.JSX.Element {
  const { t } = useTranslation()

  const icon = EMPTY_STATE_ICONS[filterView] ?? (
    <ClipboardList className="size-10 text-muted-foreground/30" />
  )
  const config = EMPTY_STATE_KEYS[filterView] ?? { title: 'emptyState.searchTitle' }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="mb-4">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground/70">{t(config.title)}</p>
      {config.hint && (
        <p className="mt-1.5 text-xs text-muted-foreground/50">{t(config.hint)}</p>
      )}
      {config.showAddButton && onAddTask && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-1.5 text-xs"
          onClick={onAddTask}
        >
          <Plus className="size-3.5" />
          {t('emptyState.createTask')}
        </Button>
      )}
      <p className="text-[11px] mt-3 text-muted-foreground/30">{t('emptyState.quickCreate')}</p>
    </div>
  )
}
