import { useCallback, useMemo } from 'react'
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
  useExportData,
  useImportData,
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
  Sun,
  Moon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from '@/components/ThemeProvider'

export function CommandPalette(): React.JSX.Element {
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
  const exportDataMut = useExportData()
  const importDataMut = useImportData()

  const { theme, setTheme } = useTheme()
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
      toast.success('数据导出成功')
    } catch {
      toast.error('数据导出失败')
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
        toast.error('数据导入失败')
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
      title="命令面板"
      description="搜索命令、导航视图或执行操作"
      showCloseButton={false}
    >
      <CommandInput placeholder="输入命令或搜索..." />
      <CommandList>
        <CommandEmpty>没有匹配的命令</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="导航">
          <CommandItem onSelect={() => handleNavigate('all')}>
            <ListTodo className="size-4" />
            <span>全部任务</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('today')}>
            <CalendarDays className="size-4" />
            <span>今天</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('upcoming')}>
            <CalendarRange className="size-4" />
            <span>即将到来</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('completed')}>
            <CheckCircle2 className="size-4" />
            <span>已完成</span>
          </CommandItem>
          <CommandItem onSelect={() => handleNavigate('stats')}>
            <BarChart3 className="size-4" />
            <span>统计</span>
          </CommandItem>
        </CommandGroup>

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="分类">
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
            <CommandGroup heading="标签">
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
        <CommandGroup heading="操作">
          <CommandItem onSelect={handleNewTask}>
            <Plus className="size-4" />
            <span>新建任务</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          {selectedTask && selectedTask.status === 'todo' && (
            <CommandItem onSelect={handleCompleteSelected}>
              <CheckCircle2 className="size-4" />
              <span>完成选中任务</span>
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
          )}
          {selectedTask && (
            <CommandItem onSelect={handleDeleteSelected}>
              <Trash2 className="size-4" />
              <span>删除选中任务</span>
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
            <span>搜索任务</span>
            <CommandShortcut>⌘F</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Data & Window */}
        <CommandGroup heading="窗口 & 数据">
          <CommandItem onSelect={handleCompactToggle}>
            {compactMode ? (
              <Maximize2 className="size-4" />
            ) : (
              <Minimize2 className="size-4" />
            )}
            <span>{compactMode ? '退出简洁模式' : '简洁模式'}</span>
            <CommandShortcut>⌘\</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={handleExport}>
            <Download className="size-4" />
            <span>导出数据</span>
          </CommandItem>
          <CommandItem onSelect={handleImport}>
            <Upload className="size-4" />
            <span>导入数据</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Theme */}
        <CommandGroup heading="主题">
          <CommandItem onSelect={() => runAndClose(() => setTheme('light'))}>
            <Sun className="size-4" />
            <span>亮色模式</span>
            {theme === 'light' && <CommandShortcut>✓</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setTheme('dark'))}>
            <Moon className="size-4" />
            <span>暗色模式</span>
            {theme === 'dark' && <CommandShortcut>✓</CommandShortcut>}
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => setTheme('system'))}>
            <Sun className="size-4" />
            <span>跟随系统</span>
            {theme === 'system' && <CommandShortcut>✓</CommandShortcut>}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}