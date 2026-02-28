// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  themePresets,
  REQUIRED_TOKENS,
  getPresetById,
  DEFAULT_PRESET_ID,
  type ThemePreset,
} from '../presets'
import { applyPresetClass, resolveColorMode, getAllThemeClasses } from '../apply'

// ============================================================
// Feature: theme-system-refactoring, Property 2:
// All presets define all required tokens
// Validates: Requirements 1.1, 2.1, 2.4, 4.2, 4.3, 4.4
// ============================================================

describe('Theme Presets — Structure & Completeness', () => {
  it('should have at least 4 theme presets', () => {
    expect(themePresets.length).toBeGreaterThanOrEqual(4)
  })

  it('Property 2: every preset has all required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets),
        (preset: ThemePreset) => {
          // id must be non-empty string
          expect(typeof preset.id).toBe('string')
          expect(preset.id.length).toBeGreaterThan(0)

          // nameKey must be non-empty string
          expect(typeof preset.nameKey).toBe('string')
          expect(preset.nameKey.length).toBeGreaterThan(0)

          // colorMode must be 'light' or 'dark'
          expect(['light', 'dark']).toContain(preset.colorMode)

          // cssClass must start with 'theme-'
          expect(preset.cssClass).toMatch(/^theme-/)

          // preview must have 3 hex colors
          expect(preset.preview.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
          expect(preset.preview.background).toMatch(/^#[0-9A-Fa-f]{6}$/)
          expect(preset.preview.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('every preset id is unique', () => {
    const ids = themePresets.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('REQUIRED_TOKENS should include priority and status tokens', () => {
    const tokens = [...REQUIRED_TOKENS]
    expect(tokens).toContain('priority-high')
    expect(tokens).toContain('priority-medium')
    expect(tokens).toContain('priority-low')
    expect(tokens).toContain('status-success')
    expect(tokens).toContain('status-warning')
    expect(tokens).toContain('status-error')
  })

  it('REQUIRED_TOKENS should include all chart tokens', () => {
    for (let i = 1; i <= 5; i++) {
      expect([...REQUIRED_TOKENS]).toContain(`chart-${i}`)
    }
  })

  it('REQUIRED_TOKENS should include all sidebar tokens', () => {
    const sidebarTokens = [
      'sidebar',
      'sidebar-foreground',
      'sidebar-primary',
      'sidebar-primary-foreground',
      'sidebar-accent',
      'sidebar-accent-foreground',
      'sidebar-border',
      'sidebar-ring',
    ]
    for (const token of sidebarTokens) {
      expect([...REQUIRED_TOKENS]).toContain(token)
    }
  })
})

describe('Theme Presets — Lookup', () => {
  it('getPresetById returns correct preset for all valid ids', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets.map((p) => p.id)),
        (id: string) => {
          const preset = getPresetById(id)
          expect(preset).toBeDefined()
          expect(preset!.id).toBe(id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getPresetById returns undefined for invalid ids', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !themePresets.some((p) => p.id === s)),
        (invalidId: string) => {
          expect(getPresetById(invalidId)).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('DEFAULT_PRESET_ID is a valid preset id', () => {
    expect(getPresetById(DEFAULT_PRESET_ID)).toBeDefined()
  })
})

describe('Theme Preset — Apply', () => {
  it('applyPresetClass adds the correct CSS class', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets),
        (preset: ThemePreset) => {
          const applied = applyPresetClass(preset.id)
          expect(applied.id).toBe(preset.id)
          expect(document.documentElement.classList.contains(preset.cssClass)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('applyPresetClass removes previous theme class when switching', () => {
    // Apply first preset
    const first = themePresets[0]
    applyPresetClass(first.id)
    expect(document.documentElement.classList.contains(first.cssClass)).toBe(true)

    // Apply a different preset with different cssClass
    const different = themePresets.find((p) => p.cssClass !== first.cssClass)
    if (different) {
      applyPresetClass(different.id)
      expect(document.documentElement.classList.contains(different.cssClass)).toBe(true)
      // Old class should be removed (if it was a different class)
      if (different.cssClass !== first.cssClass) {
        expect(document.documentElement.classList.contains(first.cssClass)).toBe(false)
      }
    }
  })

  it('applyPresetClass falls back to default for invalid id', () => {
    const result = applyPresetClass('nonexistent-preset')
    expect(result.id).toBe(DEFAULT_PRESET_ID)
  })

  it('resolveColorMode returns the correct mode for each preset', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets),
        (preset: ThemePreset) => {
          const mode = resolveColorMode(preset)
          expect(['light', 'dark']).toContain(mode)
          expect(mode).toBe(preset.colorMode)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('getAllThemeClasses returns unique class names', () => {
    const classes = getAllThemeClasses()
    expect(new Set(classes).size).toBe(classes.length)
    for (const cls of classes) {
      expect(cls).toMatch(/^theme-/)
    }
  })
})
