import { useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'

/**
 * Global keyboard shortcuts hook.
 *
 * Shortcuts:
 * - Cmd+N:     Focus the quick-add task input
 * - Cmd+D:     Delete selected task
 * - Delete:    Delete selected task
 * - Cmd+F:     Focus search
 * - Escape:    Deselect task / close search
 * - ArrowUp:   Select previous task in list
 * - ArrowDown: Select next task in list
 */
export function useKeyboardShortcuts() {
  const { state, dispatch, deleteTask, completeTask } = useApp()

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const isInputFocused = tagName === 'input' || tagName === 'textarea' || target.isContentEditable

      // Cmd+N: Focus add task input
      if (isMeta && e.key === 'n') {
        e.preventDefault()
        // Find and focus the add-task input (identified by placeholder)
        const addTaskInput = document.querySelector<HTMLInputElement>(
          'input[placeholder="添加新任务，按 Enter 确认"]'
        )
        addTaskInput?.focus()
        return
      }

      // Cmd+F: Focus search
      if (isMeta && e.key === 'f') {
        e.preventDefault()
        // Click the search toggle button if search is not open,
        // or focus the search input if it already exists
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder="搜索任务..."]'
        )
        if (searchInput) {
          searchInput.focus()
        } else {
          // Click the search button to open it
          const searchBtn = document.querySelector<HTMLButtonElement>(
            '[data-sidebar="trigger"]'
          )
          // Find the search button by looking for the Search icon button in the header
          const buttons = document.querySelectorAll<HTMLButtonElement>(
            'button.size-7'
          )
          for (const btn of buttons) {
            if (btn.querySelector('svg')?.classList.contains('lucide-search')) {
              btn.click()
              break
            }
          }
        }
        return
      }

      // Don't process shortcuts when input/textarea is focused (except Escape)
      if (isInputFocused && e.key !== 'Escape') return

      // Escape: Deselect task
      if (e.key === 'Escape') {
        // If input is focused, blur it
        if (isInputFocused) {
          target.blur()
          return
        }
        dispatch({ type: 'SELECT_TASK', payload: null })
        dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })
        return
      }

      // The following shortcuts require a selected task
      if (!state.selectedTaskId) return

      // Cmd+D or Delete: Delete selected task
      if ((isMeta && e.key === 'd') || e.key === 'Delete' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && !isMeta) return // Only Cmd+Backspace
        e.preventDefault()
        try {
          await deleteTask(state.selectedTaskId)
        } catch {
          // Error handled globally
        }
        return
      }

      // Enter: Complete selected task
      if (e.key === 'Enter') {
        e.preventDefault()
        const task = state.tasks.find((t) => t.id === state.selectedTaskId)
        if (task && task.status === 'todo') {
          try {
            await completeTask(state.selectedTaskId)
          } catch {
            // Error handled globally
          }
        }
        return
      }

      // Arrow Up/Down: Navigate tasks
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const visibleTasks = state.tasks.filter((t) => {
          // Simple: use all tasks in current view, actual filtering happens at component level
          // For keyboard nav, we just navigate through the task list order
          return true
        })
        const currentIndex = visibleTasks.findIndex(
          (t) => t.id === state.selectedTaskId
        )

        let nextIndex: number
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleTasks.length - 1
        } else {
          nextIndex = currentIndex < visibleTasks.length - 1 ? currentIndex + 1 : 0
        }

        if (visibleTasks[nextIndex]) {
          dispatch({ type: 'SELECT_TASK', payload: visibleTasks[nextIndex].id })
        }
        return
      }
    },
    [state.selectedTaskId, state.tasks, dispatch, deleteTask, completeTask]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
