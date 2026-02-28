import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/stores/ui-store'
import { useNotesQuery, useUpdateNote } from '@/hooks/useDataQueries'
import { NoteEditor } from '@/components/NoteEditor'
import { cn } from '@/lib/utils'
import { StickyNote } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Note detail panel with inline title editing and auto-saving editor.
 * Debounces saves to avoid excessive writes (1s delay).
 */
export function NoteDetail(): React.JSX.Element {
  const { t } = useTranslation()
  const selectedNoteId = useUIStore((s) => s.selectedNoteId)
  const { data: notes = [] } = useNotesQuery()
  const updateNoteMut = useUpdateNote()

  const note = notes.find((n) => n.id === selectedNoteId)

  // Local title state for responsive editing
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track which note is currently loaded to avoid stale saves
  const currentNoteIdRef = useRef<string | null>(null)

  // Sync local state when note changes
  useEffect(() => {
    if (note && note.id !== currentNoteIdRef.current) {
      currentNoteIdRef.current = note.id
      setLocalTitle(note.title)
      setLocalContent(note.content)
    }
  }, [note])

  // Clear state when no note selected
  useEffect(() => {
    if (!selectedNoteId) {
      currentNoteIdRef.current = null
      setLocalTitle('')
      setLocalContent('')
    }
  }, [selectedNoteId])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return (): void => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current)
    }
  }, [])

  const saveTitle = useCallback(
    (newTitle: string): void => {
      if (!currentNoteIdRef.current) return
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current)
      titleTimeoutRef.current = setTimeout(() => {
        if (currentNoteIdRef.current) {
          updateNoteMut.mutate({
            id: currentNoteIdRef.current,
            data: { title: newTitle },
          })
        }
      }, 800)
    },
    [updateNoteMut]
  )

  const saveContent = useCallback(
    (newContent: string): void => {
      if (!currentNoteIdRef.current) return
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current)
      contentTimeoutRef.current = setTimeout(() => {
        if (currentNoteIdRef.current) {
          updateNoteMut.mutate({
            id: currentNoteIdRef.current,
            data: { content: newContent },
          })
        }
      }, 1000)
    },
    [updateNoteMut]
  )

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTitle = e.target.value
    setLocalTitle(newTitle)
    saveTitle(newTitle)
  }

  const handleContentChange = (html: string): void => {
    setLocalContent(html)
    saveContent(html)
  }

  // Empty state — no note selected
  if (!note) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <StickyNote className="mx-auto size-12 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('notes.selectNoteHint')}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {t('notes.createNoteHint')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-2xl px-6 py-6">
        {/* Title */}
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder={t('notes.titlePlaceholder')}
          className={cn(
            'w-full bg-transparent text-xl font-semibold',
            'border-none outline-none ring-0',
            'placeholder:text-muted-foreground/40',
            'mb-4'
          )}
        />

        {/* Editor */}
        <NoteEditor
          content={localContent}
          onChange={handleContentChange}
          className="min-h-[calc(100vh-200px)]"
        />

        {/* Footer metadata */}
        <div className="mt-6 flex items-center gap-3 text-[10px] text-muted-foreground/50">
          <span>
            {t('notes.createdAt', {
              date: new Date(note.createdAt).toLocaleString(),
            })}
          </span>
          <span>
            {t('notes.updatedAt', {
              date: new Date(note.updatedAt).toLocaleString(),
            })}
          </span>
        </div>
      </div>
    </ScrollArea>
  )
}
