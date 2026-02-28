// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { themePresets, DEFAULT_PRESET_ID } from '../presets'
import { applyPresetClass } from '../apply'

// ============================================================
// Feature: theme-system-refactoring, Property 1:
// Theme preset persistence round-trip
// Validates: Requirements 1.3, 1.4
// ============================================================

const STORAGE_KEY = 'watermelon:ui'

/**
 * Simulate persisting a theme preset to localStorage (as Zustand does)
 * and then reading it back, verifying the round-trip.
 */
function simulatePersist(presetId: string): void {
  const stored = localStorage.getItem(STORAGE_KEY)
  const state = stored ? JSON.parse(stored) : { state: {} }
  state.state = { ...state.state, themePreset: presetId }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function readPersistedPreset(): string | undefined {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return undefined
  try {
    const parsed = JSON.parse(stored)
    return parsed.state?.themePreset
  } catch {
    return undefined
  }
}

describe('Theme Preset Persistence — Round-Trip', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset document classes
    document.documentElement.className = ''
  })

  it('Property 1: persist then read returns the same preset id', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets.map((p) => p.id)),
        (presetId: string) => {
          // Persist the preset id
          simulatePersist(presetId)

          // Read it back
          const restored = readPersistedPreset()

          // Should be the same
          expect(restored).toBe(presetId)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('applying a preset and persisting creates a consistent state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...themePresets),
        (preset) => {
          // Apply CSS class
          const applied = applyPresetClass(preset.id)

          // Persist
          simulatePersist(preset.id)

          // Read back
          const restored = readPersistedPreset()

          // CSS class should be on the element
          expect(document.documentElement.classList.contains(applied.cssClass)).toBe(true)

          // Persisted value should match
          expect(restored).toBe(preset.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('missing localStorage falls back gracefully', () => {
    localStorage.clear()
    const restored = readPersistedPreset()
    expect(restored).toBeUndefined()

    // When undefined, applyPresetClass with default should work
    const applied = applyPresetClass(DEFAULT_PRESET_ID)
    expect(applied.id).toBe(DEFAULT_PRESET_ID)
  })

  it('corrupted localStorage does not crash', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')
    const restored = readPersistedPreset()
    expect(restored).toBeUndefined()
  })
})
