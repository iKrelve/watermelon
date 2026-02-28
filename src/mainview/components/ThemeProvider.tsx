import { useEffect } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { useUIStore } from '@/stores/ui-store'
import { applyPresetClass, resolveColorMode } from '@/theme/apply'
import { getPresetById, DEFAULT_PRESET_ID } from '@/theme/presets'

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="watermelon:theme"
    >
      <ThemeInitializer />
      {children}
    </NextThemesProvider>
  )
}

/**
 * Initializes the theme preset on mount and listens for
 * system color scheme changes when appropriate.
 */
function ThemeInitializer(): null {
  const { setTheme } = useTheme()
  const themePreset = useUIStore((s) => s.themePreset)

  // Apply the current preset on mount and when it changes
  useEffect(() => {
    const presetId = themePreset || DEFAULT_PRESET_ID
    const preset = getPresetById(presetId)
    if (!preset) return

    applyPresetClass(presetId)
    const colorMode = resolveColorMode(preset)
    setTheme(colorMode)
  }, [themePreset, setTheme])

  return null
}

export { useTheme }
