import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command'
import { useUIStore, type FilterView } from '@/stores/ui-store'
import {
  useTasksQuery,
  useCategoriesQuery,
  useTagsQuery,
  useDeleteTask,
  useCompleteTask,
  useUncompleteTask,
  useExportData,
  useImportData,
  useCreateNote,
} from '@/hooks/useDataQueries'
import {
  ListTodo,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  BarChart3,
  Plus,
  Minimize2,
  Maximize2,
  Search,
  Trash2,
  Download,
  Upload,
  StickyNote,
  Palette,
} from 'lucide-react'
import { toast } from 'sonner'
import { themePresets } from '@/theme/presets'

export function CommandPalette(): React.JSX.Element {
  const { t } = useTranslation()
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const setCommandPalette = useUIStore((s) => s.setCommandPalette)
  const setFilterView = useUIStore((s) => s.setFilterView)
  const setFilterCategory = useUIStore((s) => s.setFilterCategory)
  const setFilterTags = useUIStore((s) => s.setFilterTags)
  const toggleCompactMode = useUIStore((s) => s.toggleCompactMode)
  const compactMode = useUIStore((s) => s.compactMode)
  const selectedTaskId = useUIStore((s) => s.selectedTaskId)

  const { data: tasks = [] } = useTasksQuery()
  const { data: categories = [] } = useCategoriesQuery()
  const { data: tags = [] } = useTagsQuery()

  const deleteTaskMut = useDeleteTask()
  const completeTaskMut = useCompleteTask()
  const uncompleteTaskMut = useUncompleteTask()
  const exportDataMut = useExportData()
  const importDataMut = useImportData()

  const selectNote = useUIStore((s) => s.selectNote)
  const createNoteMut = useCreateNote()

  const themePreset = useUIStore((s) => s.themePreset)
  const setThemePreset = useUIStore((s) => s.setThemePreset)
  const open = commandPaletteOpen

  const setOpen = useCallback(
    (value: boolean): void => {
      setCommandPalette(value)
    },
    [setCommandPalette]
  )

  const runAndClose = useCallback(
    (fn: () => void): void => {
      fn()
      setOpen(false)
    },
    [setOpen]
  )

  const handleNavigate = useCallback(
    (view: FilterView): void => {
      runAndClose(() => {
        setFilterView(view)
        setFilterCategory(null)
      })
    },
    [setFilterView, setFilterCategory, runAndClose]
  )

  const handleCategorySelect = useCallback(
    (categoryId: string): void => {
      runAndClose(() => {
        setFilterCategory(categoryId)
      })
    },
    [setFilterCategory, runAndClose]
  )

  const handleTagSelect = useCallback(
    (tagId: string): void => {
      runAndClose(() => {
        setFilterTags([tagId])
        setFilterView('tag')
      })
    },
    [setFilterTags, setFilterView, runAndClose]
  )

  const handleNewTask = useCallback((): void => {
    runAndClose(() => {
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          '[data-shortcut-target="add-task"]'
        )
        input?.focus()
      }, 100)
    })
  }, [runAndClose])

  const handleCompactToggle = useCallback((): void => {
    runAndClose(() => {
      toggleCompactMode()
    })
  }, [toggleCompactMode, runAndClose])

  const handleExport = useCallback(async (): Promise<void> => {
    setOpen(false)
    try {
      const json = await exportDataMut.mutateAsync()
      // Create a download by creating a blob URL
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `watermelon-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('command.exportSuccess'))
    } catch {
      toast.error(t('command.exportError'))
    }
  }, [setOpen, exportDataMut])

  const handleImport = useCallback((): void => {
    setOpen(false)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e): Promise<void> => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        await importDataMut.mutateAsync(text)
      } catch {
        toast.error(t('command.importError'))
      }
    }
    input.click()
  }, [setOpen, importDataMut])

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null
    return tasks.find((t) => t.id === selectedTaskId) ?? null
  }, [selectedTaskId, tasks])

  const handleCompleteSelected = useCallback(async (): Promise<void> => {
    if (!selectedTask || selectedTask.status !== 'todo') return
    setOpen(false)
    try {
      await completeTaskMut.mutateAsync(selectedTask.id)
    } catch {
      // handled globally
    }
  }, [selectedTask, completeTaskMut, setOpen])

  const handleUncompleteSelected = useCallback(async (): Promise<void> => {
    if (!selectedTask || selectedTask.status !== 'completed') return
    setOpen(false)
    try {
      await uncompleteTaskMut.mutateAsync(selectedTask.id)
    } catch {
      // handled globally
    }
  }, [selectedTask, uncompleteTaskMut, setOpen])

  const handleDeleteSelected = useCallback(async (): Promise<void> => {
    if (!selectedTask) return
    setOpen(false)
    try {
      await deleteTaskMut.mutateAsync(selectedTask.id)
    } catch {
      // handled globally
    }
  }, [selectedTask, deleteTaskMut, setOpen])

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t('command.title')}
      description={t('command.description')}
      showCloseButton={false}
    >
      <CommandInput placeholder={t('command.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('command.noMatches')}</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading={t('command.navGroup')}>
          <CommandItem onSelect={() => handleNavigate('all')}>
            <ListTodo className="size-4" />
            <span>{t('command.allTasks')}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('today')}>
            <CalendarDays className="size-4" />
            <span>{t('command.today')}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('upcoming')}>
            <CalendarRange className="size-4" />
            <span>{t('command.upcoming')}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('completed')}>
            <CheckCircle2 className="size-4" />
            <span>{t('command.completed')}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('stats')}>
            <BarChart3 className="size-4" />
            <span>{t('command.statistics')}</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('notes')}>
            <StickyNote className="size-4" />
            <span>{t('command.notes')}</span>
          </CommandItem>
        </CommandGroup>

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('command.categoriesGroup')}>
              {categories.map((cat) => (
                <CommandItem key={cat.id} onSelect={() => handleCategorySelect(cat.id)}>
                  <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || '#94a3b8' }}
                  />
                  <span>{cat.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('command.tagsGroup')}>
              {tags.map((tag) => (
                <CommandItem key={tag.id} onSelect={() => handleTagSelect(tag.id)}>
                  <div
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || '#94a3b8' }}
                  />
                  <span>{tag.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading={t('command.actionsGroup')}>
          <CommandItem onSelect={handleNewTask}>
            <Plus className="size-4" />
            <span>{t('command.newTask')}</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={async () => {
            setOpen(false)
            try {
              const note = await createNoteMut.mutateAsync({})
              setFilterView('notes')
              setFilterCategory(null)
              selectNote(note.id)
            } catch {
              // handled globally
            }
          }}>
            <StickyNote className="size-4" />
            <span>{t('command.newNote')}</span>
          </CommandItem>
          {selectedTask && selectedTask.status === 'todo' && (
            <CommandItem onSelect={handleCompleteSelected}>
              <CheckCircle2 className="size-4" />
              <span>{t('command.completeTask')}</span>
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
          )}
          {selectedTask && selectedTask.status === 'completed' && (
            <CommandItem onSelect={handleUncompleteSelected}>
              <CheckCircle2 className="size-4" />
              <span>{t('command.uncompleteTask')}</span>
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
          )}
          {selectedTask && (
            <CommandItem onSelect={handleDeleteSelected}>
              <Trash2 className="size-4" />
              <span>{t('command.deleteTask')}</span>
              <CommandShortcut>⌘D</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem onSelect={() => runAndClose(() => {
            const searchBtn = document.querySelector<HTMLButtonElement>(
              '[data-shortcut-target="search-toggle"]'
            )
            searchBtn?.click()
          })}>
            <Search className="size-4" />
            <span>{t('command.searchTask')}</span>
            <CommandShortcut>⌘F</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Data & Window */}
        <CommandGroup heading={t('command.windowDataGroup')}>
          <CommandItem onSelect={handleCompactToggle}>
            {compactMode ? (
              <Maximize2 className="size-4" />
            ) : (
              <Minimize2 className="size-4" />
            )}
            <span>{compactMode ? t('command.exitCompactMode') : t('command.compactMode')}</span>
            <CommandShortcut>⌘\</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleExport}>
            <Download className="size-4" />
            <span>{t('command.exportData')}</span>
          </CommandItem>
          <CommandItem onSelect={handleImport}>
            <Upload className="size-4" />
            <span>{t('command.importData')}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Theme */}
        <CommandGroup heading={t('command.themeGroup')}>
          {themePresets.map((preset) => (
            <CommandItem
              key={preset.id}
              onSelect={() => runAndClose(() => setThemePreset(preset.id))}
            >
              <Palette className="size-4" />
              <span>{t(preset.nameKey)}</span>
              {themePreset === preset.id && <CommandShortcut>✓</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}