// ============================================================
// Theme Preset Definitions
// Defines all available theme presets and their metadata.
// Each preset maps to a CSS class that sets color tokens in index.css.
// ============================================================

/**
 * Represents a theme preset with metadata for the UI and CSS class mapping.
 */
export interface ThemePreset {
  /** Unique identifier, e.g. 'apple-light' */
  id: string
  /** i18n key for display name */
  nameKey: string
  /** Which color mode(s) this preset supports */
  colorMode: 'light' | 'dark'
  /** CSS class applied to <html>, e.g. 'theme-apple' */
  cssClass: string
  /** Preview colors for the theme selector UI (hex) */
  preview: {
    primary: string
    background: string
    accent: string
  }
}

/**
 * All CSS custom property names that every theme preset MUST define.
 * Used for validation and property-based testing.
 */
export const REQUIRED_TOKENS = [
  // Core shadcn tokens
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  // Chart tokens
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  // Sidebar tokens
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  // Priority tokens
  'priority-high',
  'priority-medium',
  'priority-low',
  // Status tokens
  'status-success',
  'status-warning',
  'status-error',
] as const

export type RequiredToken = (typeof REQUIRED_TOKENS)[number]

/**
 * Default preset id when none is set or an invalid id is found.
 */
export const DEFAULT_PRESET_ID = 'apple-light'

/**
 * All available theme presets.
 */
export const themePresets: ThemePreset[] = [
  {
    id: 'apple-light',
    nameKey: 'theme.appleLight',
    colorMode: 'light',
    cssClass: 'theme-apple',
    preview: {
      primary: '#007AFF',
      background: '#FBFBFD',
      accent: '#E8F0FE',
    },
  },
  {
    id: 'apple-dark',
    nameKey: 'theme.appleDark',
    colorMode: 'dark',
    cssClass: 'theme-apple',
    preview: {
      primary: '#0A84FF',
      background: '#1C1C1E',
      accent: '#2C2C2E',
    },
  },
  {
    id: 'pastel',
    nameKey: 'theme.pastel',
    colorMode: 'light',
    cssClass: 'theme-pastel',
    preview: {
      primary: '#E08DAC',
      background: '#FDF6F0',
      accent: '#D4ECDD',
    },
  },
  {
    id: 'midnight',
    nameKey: 'theme.midnight',
    colorMode: 'dark',
    cssClass: 'theme-midnight',
    preview: {
      primary: '#818CF8',
      background: '#0F172A',
      accent: '#1E293B',
    },
  },
]

/**
 * Find a preset by its id. Returns undefined if not found.
 */
export function getPresetById(id: string): ThemePreset | undefined {
  return themePresets.find((p) => p.id === id)
}
