import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type SortOption, SORT_OPTION_KEYS } from './utils/sort'

export function SortMenu({
  sortOption,
  onSortChange,
}: {
  sortOption: SortOption
  onSortChange: (option: SortOption) => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={t('sort.label')}>
          <ArrowUpDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {(Object.keys(SORT_OPTION_KEYS) as SortOption[]).map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => onSortChange(option)}
            className={cn(sortOption === option && 'bg-accent font-medium')}
          >
            {t(SORT_OPTION_KEYS[option])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
