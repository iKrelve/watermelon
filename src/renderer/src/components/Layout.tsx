import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { TaskList } from '@/components/TaskList'
import { TaskDetail } from '@/components/TaskDetail'
import { Statistics } from '@/components/Statistics'
import { useApp } from '@/context/AppContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Three-panel layout: Sidebar | TaskList | TaskDetail
 * With a separate Statistics view accessible from the sidebar.
 * Follows Things 3 design aesthetics with a clean, minimal layout.
 *
 * macOS: titleBarStyle=hiddenInset, so we add a drag region at the
 * top of each panel so the user can still drag the window.
 */
export function Layout(): React.JSX.Element {
  const { state } = useApp()
  useKeyboardShortcuts()

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
