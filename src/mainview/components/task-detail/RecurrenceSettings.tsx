import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecurrenceRule, RecurrenceType } from '@shared/types'

const RECURRENCE_TYPE_KEYS: Record<RecurrenceType, string> = {
  daily: 'recurrence.daily',
  weekly: 'recurrence.weekly',
  monthly: 'recurrence.monthly',
  custom: 'recurrence.custom',
}

export function RecurrenceSettings({
  recurrenceRule,
  onChange,
}: {
  recurrenceRule: RecurrenceRule | null
  onChange: (rule: RecurrenceRule | null) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const weekdayLabels = t('calendar.weekdays', { returnObjects: true }) as string[]
  const [isOpen, setIsOpen] = useState(false)

  const handleTypeChange = (type: string): void => {
    if (type === 'none') {
      onChange(null)
      return
    }
    const newRule: RecurrenceRule = {
      type: type as RecurrenceType,
      interval: recurrenceRule?.interval ?? 1,
      daysOfWeek: type === 'weekly' ? recurrenceRule?.daysOfWeek ?? [1] : undefined,
      dayOfMonth: type === 'monthly' ? recurrenceRule?.dayOfMonth ?? 1 : undefined,
    }
    onChange(newRule)
  }

  const handleIntervalChange = (interval: number): void => {
    if (!recurrenceRule) return
    onChange({ ...recurrenceRule, interval: Math.max(1, interval) })
  }

  const toggleWeekday = (day: number): void => {
    if (!recurrenceRule) return
    const current = recurrenceRule.daysOfWeek ?? []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort()
    if (updated.length === 0) return // At least one day must be selected
    onChange({ ...recurrenceRule, daysOfWeek: updated })
  }

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
                recurrenceRule && 'border-primary/40 text-primary'
              )}
            >
              <Repeat className="size-3.5" />
              {recurrenceRule
                ? `${t(RECURRENCE_TYPE_KEYS[recurrenceRule.type])}${
                    recurrenceRule.interval > 1 ? ` ×${recurrenceRule.interval}` : ''
                  }`
                : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('recurrence.tooltip')}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <Select
            value={recurrenceRule?.type ?? 'none'}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('recurrence.none')}</SelectItem>
              <SelectItem value="daily">{t('recurrence.daily')}</SelectItem>
              <SelectItem value="weekly">{t('recurrence.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('recurrence.monthly')}</SelectItem>
              <SelectItem value="custom">{t('recurrence.custom')}</SelectItem>
            </SelectContent>
          </Select>

          {recurrenceRule && (
            <>
              {/* Interval */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{t('recurrence.every')}</span>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={recurrenceRule.interval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  className="h-7 w-16 text-sm text-center"
                />
                <span className="text-xs text-muted-foreground">
                  {recurrenceRule.type === 'daily'
                    ? t('recurrence.dayUnit')
                    : recurrenceRule.type === 'weekly'
                      ? t('recurrence.weekUnit')
                      : recurrenceRule.type === 'monthly'
                        ? t('recurrence.monthUnit')
                        : t('recurrence.timesUnit')}
                </span>
              </div>

              {/* Weekly - day selector */}
              {recurrenceRule.type === 'weekly' && (
                <div className="flex gap-1">
                  {weekdayLabels.map((label, index) => (
                    <button
                      key={index}
                      onClick={() => toggleWeekday(index)}
                      className={cn(
                        'size-7 rounded-full text-xs font-medium transition-colors',
                        recurrenceRule.daysOfWeek?.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Monthly - day of month */}
              {recurrenceRule.type === 'monthly' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t('recurrence.monthDay')}</span>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={recurrenceRule.dayOfMonth ?? 1}
                    onChange={(e) =>
                      onChange({
                        ...recurrenceRule,
                        dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                      })
                    }
                    className="h-7 w-16 text-sm text-center"
                  />
                  <span className="text-xs text-muted-foreground">{t('recurrence.monthDaySuffix')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
