import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { TaskList } from '@/components/TaskList'
import { TaskDetail } from '@/components/TaskDetail'
import { Statistics } from '@/components/Statistics'
import { useApp } from '@/context/AppContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Maximize2 } from 'lucide-react'

/**
 * Three-panel layout: Sidebar | TaskList | TaskDetail
 * With a separate Statistics view accessible from the sidebar.
 * Follows Things 3 design aesthetics with a clean, minimal layout.
 *
 * Compact mode: hides the sidebar and task detail panel, showing
 * only the task list centered on screen for a focused experience.
 *
 * macOS: titleBarStyle=hiddenInset, so we add a drag region at the
 * top of each panel so the user can still drag the window.
 */
export function Layout(): React.JSX.Element {
  const { state, dispatch } = useApp()
  useKeyboardShortcuts()

  const exitCompactMode = (): void => {
    dispatch({ type: 'TOGGLE_COMPACT_MODE' })
  }

  // Compact mode: only task list, centered
  if (state.compactMode) {
    return (
      <div className="flex h-screen flex-col bg-background">
        {/* macOS drag region */}
        <div className="drag-region h-[38px] shrink-0">
          <div className="no-drag flex h-full items-center justify-end px-3">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={exitCompactMode}
                    aria-label="退出简洁模式"
                  >
                    <Maximize2 className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">退出简洁模式 (⌘\)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Centered task list */}
        <div className="flex flex-1 justify-center overflow-hidden">
          <div className="flex w-full max-w-3xl flex-col">
            <TaskList />
          </div>
        </div>
      </div>
    )
  }

  // Stats view - full content area
  if (state.filterView === 'stats') {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          {/* macOS drag region */}
          <div className="drag-region h-[38px] shrink-0" />
          <ScrollArea className="h-[calc(100vh-38px)]">
            <Statistics />
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Default: Three-panel layout
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col overflow-hidden">
          {/* macOS drag region spanning full width */}
          <div className="drag-region h-[38px] shrink-0" />

          <div className="flex flex-1 overflow-hidden">
            {/* Middle Panel - Task List */}
            <div className="flex w-[380px] min-w-[300px] flex-col border-r border-border/60 bg-background">
              <TaskList />
            </div>

            {/* Right Panel - Task Detail */}
            <div className="flex flex-1 flex-col bg-background">
              <div className="mx-auto w-full max-w-2xl flex-1 overflow-hidden">
                <TaskDetail />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
