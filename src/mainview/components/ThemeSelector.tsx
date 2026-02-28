import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { useUIStore } from '@/stores/ui-store'
import { themePresets } from '@/theme/presets'
import type { ThemePreset } from '@/theme/presets'
import { Palette, Check, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Renders a single theme swatch button.
 */
function ThemeSwatch({
  preset,
  isActive,
  onClick,
}: {
  preset: ThemePreset
  isActive: boolean
  onClick: () => void
}): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors',
            'hover:border-primary/40 hover:bg-accent/50',
            isActive
              ? 'border-primary bg-accent/60 ring-1 ring-primary/20'
              : 'border-border'
          )}
          onClick={onClick}
          aria-label={t(preset.nameKey)}
          aria-pressed={isActive}
        >
          {/* 3-band color preview swatch */}
          <div className="flex h-6 w-full overflow-hidden rounded-md">
            <div
              className="flex-1"
              style={{ backgroundColor: preset.preview.background }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: preset.preview.primary }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: preset.preview.accent }}
            />
          </div>

          {/* Preset name */}
          <span className="max-w-full truncate text-[10px] leading-tight text-foreground/80">
            {t(preset.nameKey)}
          </span>

          {/* Active checkmark */}
          {isActive && (
            <div className="absolute right-0.5 top-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-2" strokeWidth={3} />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {t(preset.nameKey)}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Theme preset selector — shows a popover with grouped light/dark presets.
 *
 * Displays presets organized into "Light" and "Dark" sections with a 3-column grid.
 * Each swatch shows primary / background / accent as 3 color bands.
 * The currently active preset has a checkmark overlay.
 */
export function ThemeSelector(): React.JSX.Element {
  const { t } = useTranslation()
  const currentPreset = useUIStore((s) => s.themePreset)
  const setThemePreset = useUIStore((s) => s.setThemePreset)

  const lightPresets = useMemo(
    () => themePresets.filter((p) => p.colorMode === 'light'),
    []
  )
  const darkPresets = useMemo(
    () => themePresets.filter((p) => p.colorMode === 'dark'),
    []
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <SidebarMenuButton tooltip={t('sidebar.theme')}>
          <Palette className="size-4" />
          <span>{t('sidebar.theme')}</span>
        </SidebarMenuButton>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        className="w-64 p-3"
      >
        <div className="max-h-[420px] overflow-y-auto pr-1">
          <TooltipProvider delayDuration={400}>
            {/* Light themes section */}
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('theme.categoryLight')}
            </p>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {lightPresets.map((preset) => (
                <ThemeSwatch
                  key={preset.id}
                  preset={preset}
                  isActive={currentPreset === preset.id}
                  onClick={() => setThemePreset(preset.id)}
                />
              ))}
            </div>

            {/* Dark themes section */}
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('theme.categoryDark')}
            </p>
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {darkPresets.map((preset) => (
                <ThemeSwatch
                  key={preset.id}
                  preset={preset}
                  isActive={currentPreset === preset.id}
                  onClick={() => setThemePreset(preset.id)}
                />
              ))}
            </div>
          </TooltipProvider>
        </div>

        {/* System option — follows OS preference */}
        <div className="border-t border-border pt-2">
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
              'hover:bg-accent/50',
              currentPreset === 'system'
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            )}
            onClick={() => {
              // "System" follows OS light/dark preference by choosing the matching Apple preset
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
              setThemePreset(prefersDark ? 'apple-dark' : 'apple-light')
            }}
          >
            <Monitor className="size-3.5" />
            <span>{t('sidebar.themeSystem')}</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}