import { useState, useEffect, useCallback } from 'react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export interface UpdateState {
  /** Whether we're currently checking for updates */
  checking: boolean
  /** Whether an update is available */
  available: boolean
  /** The update object from Tauri (null if no update) */
  update: Update | null
  /** Current download/install progress (0-100) */
  progress: number
  /** Total content length in bytes (if known) */
  contentLength: number | null
  /** Whether we're currently downloading/installing */
  downloading: boolean
  /** Error message if something went wrong */
  error: string | null
}

export interface UseAutoUpdateReturn extends UpdateState {
  /** Check for updates manually */
  checkForUpdate: () => Promise<void>
  /** Download and install the available update, then relaunch */
  downloadAndInstall: () => Promise<void>
  /** Dismiss the update dialog */
  dismiss: () => void
}

export function useAutoUpdate(autoCheck = true): UseAutoUpdateReturn {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    available: false,
    update: null,
    progress: 0,
    contentLength: null,
    downloading: false,
    error: null
  })

  const checkForUpdate = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, checking: true, error: null }))
    try {
      const update = await check()
      if (update) {
        setState((prev) => ({
          ...prev,
          checking: false,
          available: true,
          update
        }))
      } else {
        setState((prev) => ({
          ...prev,
          checking: false,
          available: false,
          update: null
        }))
      }
    } catch (e) {
      setState((prev) => ({
        ...prev,
        checking: false,
        error: e instanceof Error ? e.message : String(e)
      }))
    }
  }, [])

  const downloadAndInstall = useCallback(async (): Promise<void> => {
    if (!state.update) return

    setState((prev) => ({ ...prev, downloading: true, progress: 0, error: null }))
    try {
      let downloaded = 0
      await state.update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setState((prev) => ({
              ...prev,
              contentLength: event.data.contentLength ?? null
            }))
            break
          case 'Progress': {
            downloaded += event.data.chunkLength
            const contentLength = state.update?.contentLength
            if (contentLength && contentLength > 0) {
              const percent = Math.round((downloaded / contentLength) * 100)
              setState((prev) => ({ ...prev, progress: Math.min(percent, 100) }))
            }
            break
          }
          case 'Finished':
            setState((prev) => ({ ...prev, progress: 100 }))
            break
        }
      })
      // Relaunch the app after install
      await relaunch()
    } catch (e) {
      setState((prev) => ({
        ...prev,
        downloading: false,
        error: e instanceof Error ? e.message : String(e)
      }))
    }
  }, [state.update])

  const dismiss = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      available: false,
      update: null,
      progress: 0,
      downloading: false
    }))
  }, [])

  useEffect(() => {
    if (autoCheck) {
      // Delay the check slightly to not block app startup
      const timer = setTimeout(() => {
        void checkForUpdate()
      }, 3000)
      return (): void => clearTimeout(timer)
    }
  }, [autoCheck, checkForUpdate])

  return {
    ...state,
    checkForUpdate,
    downloadAndInstall,
    dismiss
  }
}
