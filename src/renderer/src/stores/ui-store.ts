import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n'

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

interface UIState {
  selectedTaskId: string | null
  filterView: FilterView
  filterCategoryId: string | null
  filterTagIds: string[]
  searchQuery: string
  compactMode: boolean
  commandPaletteOpen: boolean
  language: string
}

interface UIActions {
  selectTask: (id: string | null) => void
  setFilterView: (view: FilterView) => void
  setFilterCategory: (id: string | null) => void
  setFilterTags: (ids: string[]) => void
  setSearchQuery: (query: string) => void
  toggleCompactMode: () => void
  toggleCommandPalette: () => void
  setCommandPalette: (open: boolean) => void
  setLanguage: (lang: string) => void
}

export type UIStore = UIState & UIActions

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // State
      selectedTaskId: null,
      filterView: 'all',
      filterCategoryId: null,
      filterTagIds: [],
      searchQuery: '',
      compactMode: false,
      commandPaletteOpen: false,
      language: 'zh-CN',

      // Actions
      selectTask: (id) => set({ selectedTaskId: id }),

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
    }),
    {
      name: 'watermelon:ui',
      partialize: (state) => ({
        compactMode: state.compactMode,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync i18n language from persisted state on app start
        if (state?.language) {
          i18n.changeLanguage(state.language)
        }
      },
    }
  )
)
