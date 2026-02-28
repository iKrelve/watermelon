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
  // ── Apple ──
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
  // ── Pastel ──
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
  // ── Rose ──
  {
    id: 'rose-light',
    nameKey: 'theme.roseLight',
    colorMode: 'light',
    cssClass: 'theme-rose',
    preview: {
      primary: '#DB2777',
      background: '#FDF2F8',
      accent: '#FCE7F3',
    },
  },
  {
    id: 'rose-dark',
    nameKey: 'theme.roseDark',
    colorMode: 'dark',
    cssClass: 'theme-rose',
    preview: {
      primary: '#F472B6',
      background: '#2A1525',
      accent: '#3D1F35',
    },
  },
  // ── Forest ──
  {
    id: 'forest-light',
    nameKey: 'theme.forestLight',
    colorMode: 'light',
    cssClass: 'theme-forest',
    preview: {
      primary: '#16A34A',
      background: '#F0FDF4',
      accent: '#DCFCE7',
    },
  },
  {
    id: 'forest-dark',
    nameKey: 'theme.forestDark',
    colorMode: 'dark',
    cssClass: 'theme-forest',
    preview: {
      primary: '#4ADE80',
      background: '#14291E',
      accent: '#1E3A2C',
    },
  },
  // ── Ocean ──
  {
    id: 'ocean-light',
    nameKey: 'theme.oceanLight',
    colorMode: 'light',
    cssClass: 'theme-ocean',
    preview: {
      primary: '#0891B2',
      background: '#F0FDFA',
      accent: '#CCFBF1',
    },
  },
  {
    id: 'ocean-dark',
    nameKey: 'theme.oceanDark',
    colorMode: 'dark',
    cssClass: 'theme-ocean',
    preview: {
      primary: '#22D3EE',
      background: '#132A35',
      accent: '#1A3A47',
    },
  },
  // ── Sunset ──
  {
    id: 'sunset-light',
    nameKey: 'theme.sunsetLight',
    colorMode: 'light',
    cssClass: 'theme-sunset',
    preview: {
      primary: '#EA580C',
      background: '#FFFBEB',
      accent: '#FEF3C7',
    },
  },
  {
    id: 'sunset-dark',
    nameKey: 'theme.sunsetDark',
    colorMode: 'dark',
    cssClass: 'theme-sunset',
    preview: {
      primary: '#FB923C',
      background: '#2A1A10',
      accent: '#3D2617',
    },
  },
  // ── Lavender ──
  {
    id: 'lavender-light',
    nameKey: 'theme.lavenderLight',
    colorMode: 'light',
    cssClass: 'theme-lavender',
    preview: {
      primary: '#7C3AED',
      background: '#FAF5FF',
      accent: '#EDE9FE',
    },
  },
  {
    id: 'lavender-dark',
    nameKey: 'theme.lavenderDark',
    colorMode: 'dark',
    cssClass: 'theme-lavender',
    preview: {
      primary: '#A78BFA',
      background: '#1E1530',
      accent: '#2E2145',
    },
  },
  // ── Midnight (always dark) ──
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
  // ── Nord (always dark) ──
  {
    id: 'nord',
    nameKey: 'theme.nord',
    colorMode: 'dark',
    cssClass: 'theme-nord',
    preview: {
      primary: '#88C0D0',
      background: '#2E3440',
      accent: '#3B4252',
    },
  },
  // ── Monokai (always dark) ──
  {
    id: 'monokai',
    nameKey: 'theme.monokai',
    colorMode: 'dark',
    cssClass: 'theme-monokai',
    preview: {
      primary: '#A6E22E',
      background: '#272822',
      accent: '#3E3D32',
    },
  },
]

/**
 * Find a preset by its id. Returns undefined if not found.
 */
export function getPresetById(id: string): ThemePreset | undefined {
  return themePresets.find((p) => p.id === id)
}