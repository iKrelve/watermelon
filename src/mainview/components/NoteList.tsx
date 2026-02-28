import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/stores/ui-store'
import { useNotesQuery, useCreateNote, useDeleteNote, useUpdateNote } from '@/hooks/useDataQueries'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, StickyNote, Search, Pin, PinOff, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { Note } from '@shared/types'

/**
 * Strips HTML tags to produce a plain-text excerpt for the note card.
 */
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.trim() ?? ''
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString()
}

export function NoteList(): React.JSX.Element {
  const { t } = useTranslation()
  const selectedNoteId = useUIStore((s) => s.selectedNoteId)
  const selectNote = useUIStore((s) => s.selectNote)
  const noteSearchQuery = useUIStore((s) => s.noteSearchQuery)
  const setNoteSearchQuery = useUIStore((s) => s.setNoteSearchQuery)

  const { data: notes = [] } = useNotesQuery()
  const createNoteMut = useCreateNote()
  const deleteNoteMut = useDeleteNote()
  const updateNoteMut = useUpdateNote()

  const [deleteDialogNote, setDeleteDialogNote] = useState<Note | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!noteSearchQuery.trim()) return notes
    const query = noteSearchQuery.toLowerCase()
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        stripHtml(n.content).toLowerCase().includes(query)
    )
  }, [notes, noteSearchQuery])

  const handleCreateNote = async (): Promise<void> => {
    try {
      const note = await createNoteMut.mutateAsync({})
      selectNote(note.id)
    } catch {
      // Error handled by global handler
    }
  }

  const handleDeleteNote = async (): Promise<void> => {
    if (!deleteDialogNote) return
    try {
      await deleteNoteMut.mutateAsync(deleteDialogNote.id)
      if (selectedNoteId === deleteDialogNote.id) {
        selectNote(null)
      }
    } catch {
      // Error handled by global handler
    }
    setDeleteDialogNote(null)
  }

  const handleTogglePin = async (note: Note): Promise<void> => {
    try {
      await updateNoteMut.mutateAsync({
        id: note.id,
        data: { isPinned: !note.isPinned },
      })
    } catch {
      // Error handled by global handler
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{t('sidebar.notes')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('notes.noteCount', { count: notes.length })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              setSearchVisible(!searchVisible)
              if (searchVisible) setNoteSearchQuery('')
            }}
          >
            {searchVisible ? <X className="size-3.5" /> : <Search className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => void handleCreateNote()}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {searchVisible && (
        <div className="px-3 py-2 border-b border-border/40">
          <Input
            placeholder={t('notes.searchPlaceholder')}
            value={noteSearchQuery}
            onChange={(e) => setNoteSearchQuery(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
        </div>
      )}

      {/* Note list */}
      <ScrollArea className="flex-1">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <StickyNote className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t('notes.emptyTitle')}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t('notes.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                onSelect={() => selectNote(note.id)}
                onTogglePin={() => void handleTogglePin(note)}
                onDelete={() => setDeleteDialogNote(note)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteDialogNote}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogNote(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notes.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notes.confirmDeleteMessage', {
                title: deleteDialogNote?.title || t('notes.titlePlaceholder'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('notes.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteNote()}
            >
              {t('notes.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// NoteCard
// ============================================================

interface NoteCardProps {
  note: Note
  isSelected: boolean
  onSelect: () => void
  onTogglePin: () => void
  onDelete: () => void
}

function NoteCard({
  note,
  isSelected,
  onSelect,
  onTogglePin,
  onDelete,
}: NoteCardProps): React.JSX.Element {
  const { t } = useTranslation()
  const excerpt = useMemo(() => {
    const text = stripHtml(note.content)
    return text.length > 80 ? text.slice(0, 80) + '...' : text
  }, [note.content])

  const title = note.title || t('notes.titlePlaceholder')

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full text-left px-4 py-3 border-b border-border/30 transition-colors',
            'hover:bg-accent/50',
            isSelected && 'bg-accent'
          )}
          onClick={onSelect}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {note.isPinned && (
                  <Pin className="size-3 text-primary shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{title}</span>
              </div>
              {excerpt && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {excerpt}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {formatRelativeDate(note.updatedAt)}
              </p>
            </div>
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onTogglePin}>
          {note.isPinned ? (
            <>
              <PinOff className="mr-2 size-4" />
              {t('notes.unpin')}
            </>
          ) : (
            <>
              <Pin className="mr-2 size-4" />
              {t('notes.pin')}
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 size-4" />
          {t('notes.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
