import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    }),
    {
      name: 'watermelon:ui',
      partialize: (state) => ({
        compactMode: state.compactMode,
      }),
    }
  )
)
