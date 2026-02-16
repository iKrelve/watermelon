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
 */
export function Layout() {
  const { state } = useApp()
  useKeyboardShortcuts()

  // Stats view - full content area
  if (state.filterView === 'stats') {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <ScrollArea className="h-screen">
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
        <div className="flex h-screen overflow-hidden">
          {/* Middle Panel - Task List */}
          <div className="flex w-[340px] min-w-[280px] flex-col border-r border-border bg-background">
            <TaskList />
          </div>

          {/* Right Panel - Task Detail */}
          <div className="flex flex-1 flex-col bg-background">
            <TaskDetail />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
