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
import { Palette, Check, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Theme preset selector — replaces the old light/dark/system dropdown.
 *
 * Displays a Popover with 4 preset color swatches + a "System" option.
 * Each swatch shows primary / background / accent as 3 color bands.
 * The currently active preset has a checkmark overlay.
 */
export function ThemeSelector(): React.JSX.Element {
  const { t } = useTranslation()
  const currentPreset = useUIStore((s) => s.themePreset)
  const setThemePreset = useUIStore((s) => s.setThemePreset)

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
        className="w-56 p-3"
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {t('sidebar.theme')}
        </p>

        {/* Preset grid — 2 columns */}
        <div className="grid grid-cols-2 gap-2">
          <TooltipProvider delayDuration={400}>
            {themePresets.map((preset) => {
              const isActive = currentPreset === preset.id
              return (
                <Tooltip key={preset.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors',
                        'hover:border-primary/40 hover:bg-accent/50',
                        isActive
                          ? 'border-primary bg-accent/60 ring-1 ring-primary/20'
                          : 'border-border'
                      )}
                      onClick={() => setThemePreset(preset.id)}
                      aria-label={t(preset.nameKey)}
                      aria-pressed={isActive}
                    >
                      {/* 3-band color preview swatch */}
                      <div className="flex h-8 w-full overflow-hidden rounded-md">
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
                      <span className="text-[11px] leading-tight text-foreground/80">
                        {t(preset.nameKey)}
                      </span>

                      {/* Active checkmark */}
                      {isActive && (
                        <div className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-2.5" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {t(preset.nameKey)}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </div>

        {/* System option — follows OS preference */}
        <div className="mt-2 border-t border-border pt-2">
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
