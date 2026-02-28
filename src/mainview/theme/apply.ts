// ============================================================
// Theme Preset Application Logic
// Manages CSS class on <html> to activate theme preset variables.
// ============================================================

import {
  themePresets,
  getPresetById,
  DEFAULT_PRESET_ID,
  type ThemePreset,
} from './presets'

/** Prefix used for all theme preset CSS classes. */
const THEME_CLASS_PREFIX = 'theme-'

/**
 * Remove all theme-related CSS classes from the given element.
 */
function removeAllThemeClasses(el: HTMLElement): void {
  const toRemove: string[] = []
  el.classList.forEach((cls) => {
    if (cls.startsWith(THEME_CLASS_PREFIX)) {
      toRemove.push(cls)
    }
  })
  for (const cls of toRemove) {
    el.classList.remove(cls)
  }
}

/**
 * Apply a theme preset's CSS class to `document.documentElement`.
 * Removes any previously applied theme class first.
 *
 * @param presetId - The preset id to apply (e.g. 'apple-light').
 *                   Falls back to DEFAULT_PRESET_ID if invalid.
 * @returns The resolved ThemePreset that was applied.
 */
export function applyPresetClass(presetId: string): ThemePreset {
  const preset = getPresetById(presetId) ?? getPresetById(DEFAULT_PRESET_ID)!
  const el = document.documentElement

  removeAllThemeClasses(el)
  el.classList.add(preset.cssClass)

  return preset
}

/**
 * Resolve the color mode ('light' or 'dark') for a given preset.
 */
export function resolveColorMode(preset: ThemePreset): 'light' | 'dark' {
  return preset.colorMode
}

/**
 * Get all unique CSS class names used by presets.
 * Useful for cleanup or validation.
 */
export function getAllThemeClasses(): string[] {
  return [...new Set(themePresets.map((p) => p.cssClass))]
}
