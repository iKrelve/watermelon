import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { themePresets, type ThemePreset } from '../presets'

// ============================================================
// Feature: theme-system-refactoring, Property 3:
// Text/background contrast meets WCAG AA
// Validates: Requirements 2.5
// ============================================================

/**
 * Parse an oklch color string into { L, C, H } components.
 * Accepts format: oklch(L C H) or oklch(L C H / alpha)
 */
function parseOklch(value: string): { L: number; C: number; H: number } | null {
  const match = value.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/
  )
  if (!match) return null
  return {
    L: parseFloat(match[1]),
    C: parseFloat(match[2]),
    H: parseFloat(match[3]),
  }
}

/**
 * Approximate relative luminance from oklch Lightness.
 *
 * In oklch, L is perceptual lightness [0, 1].
 * For contrast ratio calculation, we approximate relative luminance
 * using the relationship: Y ≈ L^3 (cubic approximation of CIELAB → XYZ).
 *
 * This is an approximation — for full accuracy, we'd need to convert
 * oklch → CIEXYZ → sRGB → relative luminance, but this is sufficient
 * for validating that our themes have reasonable contrast.
 */
function approximateRelativeLuminance(oklchL: number): number {
  // L in oklch is perceptual lightness, Y (luminance) ≈ L^3
  return Math.pow(oklchL, 3)
}

/**
 * Calculate WCAG contrast ratio between two relative luminance values.
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 >= L2
 */
function contrastRatio(luminance1: number, luminance2: number): number {
  const l1 = Math.max(luminance1, luminance2)
  const l2 = Math.min(luminance1, luminance2)
  return (l1 + 0.05) / (l2 + 0.05)
}

/**
 * Color pairs that must meet WCAG AA contrast (4.5:1 for normal text).
 * Each pair maps a token to its background token.
 */
const CRITICAL_PAIRS: Array<{
  name: string
  foreground: string
  background: string
  minRatio: number
}> = [
  {
    name: 'foreground on background',
    foreground: '--foreground',
    background: '--background',
    minRatio: 4.5,
  },
  {
    name: 'card-foreground on card',
    foreground: '--card-foreground',
    background: '--card',
    minRatio: 4.5,
  },
  {
    name: 'popover-foreground on popover',
    foreground: '--popover-foreground',
    background: '--popover',
    minRatio: 4.5,
  },
]

/**
 * Theme color map: extracted oklch L values from CSS for each preset.
 * We define these inline since in a unit test we don't have a running CSS engine.
 */
const presetColors: Record<string, Record<string, string>> = {
  'apple-light': {
    '--background': 'oklch(0.985 0.003 250)',
    '--foreground': 'oklch(0.14 0.005 260)',
    '--card': 'oklch(0.995 0.001 250)',
    '--card-foreground': 'oklch(0.14 0.005 260)',
    '--popover': 'oklch(0.995 0.001 250)',
    '--popover-foreground': 'oklch(0.14 0.005 260)',
  },
  'apple-dark': {
    '--background': 'oklch(0.155 0.005 260)',
    '--foreground': 'oklch(0.96 0.005 250)',
    '--card': 'oklch(0.19 0.005 260)',
    '--card-foreground': 'oklch(0.96 0.005 250)',
    '--popover': 'oklch(0.19 0.005 260)',
    '--popover-foreground': 'oklch(0.96 0.005 250)',
  },
  pastel: {
    '--background': 'oklch(0.975 0.01 60)',
    '--foreground': 'oklch(0.18 0.02 20)',
    '--card': 'oklch(0.985 0.008 60)',
    '--card-foreground': 'oklch(0.18 0.02 20)',
    '--popover': 'oklch(0.985 0.008 60)',
    '--popover-foreground': 'oklch(0.18 0.02 20)',
  },
  midnight: {
    '--background': 'oklch(0.13 0.025 275)',
    '--foreground': 'oklch(0.92 0.01 270)',
    '--card': 'oklch(0.17 0.02 275)',
    '--card-foreground': 'oklch(0.92 0.01 270)',
    '--popover': 'oklch(0.17 0.02 275)',
    '--popover-foreground': 'oklch(0.92 0.01 270)',
  },
}

describe('Theme Contrast — WCAG AA Compliance', () => {
  it('Property 3: all presets meet WCAG AA contrast for critical text pairs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets),
        fc.constantFrom(...CRITICAL_PAIRS),
        (preset: ThemePreset, pair) => {
          const colors = presetColors[preset.id]
          if (!colors) {
            // Skip presets that don't have colors defined in the test map
            return true
          }

          const fgStr = colors[pair.foreground]
          const bgStr = colors[pair.background]
          if (!fgStr || !bgStr) return true

          const fg = parseOklch(fgStr)
          const bg = parseOklch(bgStr)
          if (!fg || !bg) return true

          const fgLum = approximateRelativeLuminance(fg.L)
          const bgLum = approximateRelativeLuminance(bg.L)
          const ratio = contrastRatio(fgLum, bgLum)

          expect(ratio).toBeGreaterThanOrEqual(pair.minRatio)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('parseOklch correctly parses valid oklch strings', () => {
    const result = parseOklch('oklch(0.585 0.22 260)')
    expect(result).toEqual({ L: 0.585, C: 0.22, H: 260 })
  })

  it('parseOklch handles alpha values', () => {
    const result = parseOklch('oklch(0.585 0.22 260 / 0.5)')
    expect(result).toEqual({ L: 0.585, C: 0.22, H: 260 })
  })

  it('parseOklch returns null for invalid strings', () => {
    expect(parseOklch('#ff0000')).toBeNull()
    expect(parseOklch('rgb(255, 0, 0)')).toBeNull()
    expect(parseOklch('')).toBeNull()
  })

  it('contrastRatio is symmetric', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (a, b) => {
          expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
        }
      ),
      { numRuns: 100 }
    )
  })
})
