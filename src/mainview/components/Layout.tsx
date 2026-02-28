import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { TaskList } from '@/components/task-list'
import { TaskDetail } from '@/components/TaskDetail'
import { Statistics } from '@/components/Statistics'
import { CalendarView } from '@/components/CalendarView'
import { useUIStore } from '@/stores/ui-store'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Maximize2 } from 'lucide-react'
import { CommandPalette } from '@/components/CommandPalette'

/**
 * Three-panel layout: Sidebar | TaskList | TaskDetail
 * With a separate Statistics view accessible from the sidebar.
 * Follows Things 3 design aesthetics with a clean, minimal layout.
 *
 * Compact mode: hides the sidebar and task detail panel, showing
 * only the task list centered on screen for a focused experience.
 *
 * macOS: titleBarStyle=Overlay, so we add a drag region at the
 * top of each panel so the user can still drag the window.
 */
export function Layout(): React.JSX.Element {
  const { t } = useTranslation()
  const filterView = useUIStore((s) => s.filterView)
  const compactMode = useUIStore((s) => s.compactMode)
  const toggleCompactMode = useUIStore((s) => s.toggleCompactMode)
  useKeyboardShortcuts()

  // On mount, sync window size if app was last left in compact mode
  useEffect(() => {
    if (compactMode) {
      window.api.setCompactMode(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exitCompactMode = (): void => {
    toggleCompactMode()
  }

  // Compact mode: only task list, centered
  if (compactMode) {
    return (
      <div className="flex h-screen flex-col bg-background">
        {/* macOS drag region */}
        <div data-tauri-drag-region className="drag-region flex h-[38px] shrink-0 items-center justify-end px-3">
          <div className="no-drag">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={exitCompactMode}
                    aria-label={t('layout.exitCompactMode')}
                  >
                    <Maximize2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t('layout.exitCompactModeTooltip')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Task list fills the compact window */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TaskList />
        </div>

        <CommandPalette />
      </div>
    )
  }

  // Stats view - full content area
  if (filterView === 'stats') {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          {/* macOS drag region */}
          <div data-tauri-drag-region className="drag-region h-[38px] shrink-0" />
          <ScrollArea className="h-[calc(100vh-38px)]">
            <Statistics />
          </ScrollArea>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    )
  }

  // Calendar view - full content area
  if (filterView === 'calendar') {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-screen flex-col overflow-hidden">
            {/* macOS drag region */}
            <div data-tauri-drag-region className="drag-region h-[38px] shrink-0" />
            <div className="flex-1 overflow-hidden">
              <CalendarView />
            </div>
          </div>
        </SidebarInset>
        <CommandPalette />
      </SidebarProvider>
    )
  }

  // Default: Three-panel layout with resizable panels
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col overflow-hidden">
          {/* macOS drag region spanning full width */}
          <div data-tauri-drag-region className="drag-region h-[38px] shrink-0" />

          <ResizablePanelGroup
            orientation="horizontal"
            className="flex-1"
          >
            {/* Middle Panel - Task List */}
            <ResizablePanel
              id="task-list"
              defaultSize="35%"
              minSize="20%"
              maxSize="55%"
              className="flex flex-col border-r border-border/60 bg-background"
            >
              <TaskList />
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle className="w-px bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors" />

            {/* Right Panel - Task Detail */}
            <ResizablePanel
              id="task-detail"
              defaultSize="65%"
              minSize="30%"
              className="flex flex-col bg-background"
            >
              <div className="mx-auto w-full max-w-2xl flex-1 overflow-hidden">
                <TaskDetail />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}