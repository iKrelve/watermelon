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
import { Calendar } from '@/components/ui/calendar'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function ReminderSettings({
  reminderTime,
  onChange,
}: {
  reminderTime: string | null
  onChange: (time: string | null) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const currentDate = reminderTime ? parseISO(reminderTime) : null

  const handleDateSelect = (date: Date | undefined): void => {
    if (!date) {
      onChange(null)
      return
    }
    // Preserve existing time or set to 9:00
    const hours = currentDate ? currentDate.getHours() : 9
    const minutes = currentDate ? currentDate.getMinutes() : 0
    date.setHours(hours, minutes, 0, 0)
    onChange(date.toISOString())
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const [hours, minutes] = e.target.value.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return

    const date = currentDate ? new Date(currentDate) : new Date()
    date.setHours(hours, minutes, 0, 0)
    onChange(date.toISOString())
  }

  const handleClear = (): void => {
    onChange(null)
    setIsOpen(false)
  }

  const timeValue = currentDate
    ? `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`
    : '09:00'

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
                reminderTime && 'border-primary/40 text-primary'
              )}
            >
              <Bell className="size-3.5" />
              {reminderTime
                ? format(parseISO(reminderTime), 'M月d日 HH:mm', { locale: zhCN })
                : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('reminder.tooltip')}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <Calendar
            mode="single"
            selected={currentDate ?? undefined}
            onSelect={handleDateSelect}
            locale={zhCN}
          />
          <div className="flex items-center gap-2 px-1">
            <Bell className="size-3.5 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="h-7 w-28 text-sm"
            />
            {reminderTime && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive"
                onClick={handleClear}
              >
                {t('reminder.clear')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
