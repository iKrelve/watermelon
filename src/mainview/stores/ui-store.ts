import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'
import { applyPresetClass, resolveColorMode } from '@/theme/apply'
import { getPresetById, DEFAULT_PRESET_ID } from '@/theme/presets'

// ============================================================
// UI Store — lightweight UI state managed by Zustand
// Persists compact mode and theme preferences to localStorage.
// ============================================================

export type FilterView =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'completed'
  | 'category'
  | 'tag'
  | 'stats'
  | 'calendar'
  | 'notes'

interface UIState {
  selectedTaskId: string | null
  selectedNoteId: string | null
  filterView: FilterView
  filterCategoryId: string | null
  filterTagIds: string[]
  searchQuery: string
  noteSearchQuery: string
  compactMode: boolean
  commandPaletteOpen: boolean
  language: string
  themePreset: string
}

interface UIActions {
  selectTask: (id: string | null) => void
  selectNote: (id: string | null) => void
  setFilterView: (view: FilterView) => void
  setFilterCategory: (id: string | null) => void
  setFilterTags: (ids: string[]) => void
  setSearchQuery: (query: string) => void
  setNoteSearchQuery: (query: string) => void
  toggleCompactMode: () => void
  toggleCommandPalette: () => void
  setCommandPalette: (open: boolean) => void
  setLanguage: (lang: string) => void
  setThemePreset: (presetId: string) => void
}

export type UIStore = UIState & UIActions

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      selectedTaskId: null,
      selectedNoteId: null,
      filterView: 'all',
      filterCategoryId: null,
      filterTagIds: [],
      searchQuery: '',
      noteSearchQuery: '',
      compactMode: false,
      commandPaletteOpen: false,
      language: 'zh-CN',
      themePreset: DEFAULT_PRESET_ID,

      // Actions
      selectTask: (id) => set({ selectedTaskId: id }),

      selectNote: (id) => set({ selectedNoteId: id }),

      setFilterView: (view) =>
        set({ filterView: view, selectedTaskId: null }),

      setFilterCategory: (id) =>
        set((state) => ({
          filterCategoryId: id,
          filterView: id !== null ? 'category' : state.filterView,
          selectedTaskId: null,
        })),

      setFilterTags: (ids) => set({ filterTagIds: ids }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      setNoteSearchQuery: (query) => set({ noteSearchQuery: query }),

      toggleCompactMode: () =>
        set((state) => {
          const next = !state.compactMode
          window.api.setCompactMode(next)
          return { compactMode: next }
        }),

      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      setCommandPalette: (open) => set({ commandPaletteOpen: open }),

      setLanguage: (lang) => {
        i18n.changeLanguage(lang)
        set({ language: lang })
      },

      setThemePreset: (presetId) => {
        const preset = getPresetById(presetId)
        if (!preset) return

        // Enable smooth transition
        document.documentElement.classList.add('theme-transitioning')

        // Apply the CSS class for the preset
        applyPresetClass(presetId)

        // Resolve and set the color mode via next-themes
        // next-themes listens for class changes on <html> (.dark / .light)
        const colorMode = resolveColorMode(preset)
        document.documentElement.classList.toggle('dark', colorMode === 'dark')
        document.documentElement.classList.toggle('light', colorMode === 'light')

        set({ themePreset: presetId })

        // Remove transition class after animation completes
        setTimeout(() => {
          document.documentElement.classList.remove('theme-transitioning')
        }, 250)
      },
    }),
    {
      name: 'watermelon:ui',
      partialize: (state) => ({
        compactMode: state.compactMode,
        language: state.language,
        themePreset: state.themePreset,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync i18n language from persisted state on app start
        if (state?.language) {
          i18n.changeLanguage(state.language)
        }
        // Restore theme preset CSS class on app start
        if (state?.themePreset) {
          const preset = getPresetById(state.themePreset)
          if (preset) {
            applyPresetClass(state.themePreset)
            const colorMode = resolveColorMode(preset)
            document.documentElement.classList.toggle('dark', colorMode === 'dark')
            document.documentElement.classList.toggle('light', colorMode === 'light')
          }
        }
      },
    }
  )
)
