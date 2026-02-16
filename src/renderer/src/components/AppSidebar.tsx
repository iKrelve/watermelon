import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApp, type FilterView } from '@/context/AppContext'
import { filterToday, filterUpcoming } from '@/utils/date-filters'
import { CategoryDialog } from '@/components/CategoryDialog'
import { useState } from 'react'
import {
  ListTodo,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  BarChart3,
  FolderOpen,
  Tag,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
} from 'lucide-react'

interface SmartFilterItem {
  id: FilterView
  label: string
  icon: React.ReactNode
  getBadge?: (tasks: ReturnType<typeof useApp>['state']['tasks']) => number
}

const smartFilters: SmartFilterItem[] = [
  {
    id: 'all',
    label: '全部',
    icon: <ListTodo className="size-4" />,
    getBadge: (tasks) => tasks.filter((t) => t.status === 'todo').length,
  },
  {
    id: 'today',
    label: '今天',
    icon: <CalendarDays className="size-4" />,
    getBadge: (tasks) => filterToday(tasks).length,
  },
  {
    id: 'upcoming',
    label: '即将到来',
    icon: <CalendarRange className="size-4" />,
    getBadge: (tasks) => filterUpcoming(tasks).length,
  },
  {
    id: 'completed',
    label: '已完成',
    icon: <CheckCircle2 className="size-4" />,
    getBadge: (tasks) => tasks.filter((t) => t.status === 'completed').length,
  },
]

export function AppSidebar(): React.JSX.Element {
  const { state, dispatch, createCategory, updateCategory, deleteCategory } = useApp()
  const { tasks, categories, tags, filterView, filterCategoryId } = state

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{
    id: string
    name: string
    color: string | null
  } | null>(null)

  const handleFilterClick = (view: FilterView) => {
    dispatch({ type: 'SET_FILTER_VIEW', payload: view })
    dispatch({ type: 'SET_FILTER_CATEGORY', payload: null })
  }

  const handleCategoryClick = (categoryId: string) => {
    dispatch({ type: 'SET_FILTER_CATEGORY', payload: categoryId })
  }

  const handleTagClick = (tagId: string) => {
    const current = state.filterTagIds
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId]
    dispatch({ type: 'SET_FILTER_TAGS', payload: updated })
    if (state.filterView !== 'tag') {
      dispatch({ type: 'SET_FILTER_VIEW', payload: 'tag' })
    }
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: { id: string; name: string; color: string | null }) => {
    setEditingCategory(category)
    setCategoryDialogOpen(true)
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id)
    } catch {
      // Error will be handled by the global error handler later
    }
  }

  const handleCategoryDialogSubmit = async (name: string, color: string | null) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name, color: color ?? undefined })
      } else {
        await createCategory({ name, color: color ?? undefined })
      }
      setCategoryDialogOpen(false)
      setEditingCategory(null)
    } catch {
      // Error will be handled by the global error handler later
    }
  }

  const getTaskCountForCategory = (categoryId: string) => {
    return tasks.filter((t) => t.categoryId === categoryId && t.status === 'todo').length
  }

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        {/* macOS drag region — accounts for hidden title bar + traffic lights */}
        <div className="drag-region h-[38px] shrink-0" />

        {/* App Header */}
        <SidebarHeader className="px-4 pb-2 pt-0">
          <div className="flex items-center gap-2.5">
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0"
            >
              {/* 微笑西瓜半圆 - 垂直居中 */}
              <g transform="translate(16, 18)">
                {/* 绿色外皮半圆 */}
                <path d="M-12,2 A12,12 0 0,1 12,2 Z" fill="#22c55e" />
                {/* 深绿条纹 */}
                <g opacity="0.3">
                  <path d="M-8,2 Q-6.5,-5 -4.5,2" fill="none" stroke="#15803d" strokeWidth="1.1" strokeLinecap="round" />
                  <path d="M-1.5,2 Q0,-8.5 1.5,2" fill="none" stroke="#15803d" strokeWidth="1.1" strokeLinecap="round" />
                  <path d="M4.5,2 Q6,-5.5 8,2" fill="none" stroke="#15803d" strokeWidth="1.1" strokeLinecap="round" />
                </g>
                {/* 浅绿白瓤 */}
                <path d="M-10,2 A10,10 0 0,1 10,2 Z" fill="#dcfce7" />
                {/* 红色果肉 */}
                <path d="M-8.5,2 A8.5,8.5 0 0,1 8.5,2 Z" fill="#ef4444" />
                {/* 眼睛 */}
                <ellipse cx="-3" cy="-1.5" rx="0.75" ry="1" fill="#1e293b" />
                <ellipse cx="-3.2" cy="-1.9" rx="0.22" ry="0.32" fill="#ffffff" opacity="0.7" />
                <ellipse cx="3" cy="-1.5" rx="0.75" ry="1" fill="#1e293b" />
                <ellipse cx="2.8" cy="-1.9" rx="0.22" ry="0.32" fill="#ffffff" opacity="0.7" />
                {/* 微笑 */}
                <path d="M-1.8,0.3 Q0,2 1.8,0.3" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeLinecap="round" />
                {/* 腮红 */}
                <ellipse cx="-5" cy="0" rx="1.1" ry="0.6" fill="#fca5a5" opacity="0.5" />
                <ellipse cx="5" cy="0" rx="1.1" ry="0.6" fill="#fca5a5" opacity="0.5" />
              </g>
            </svg>
            <span className="text-sm font-semibold tracking-tight text-foreground/90 group-data-[collapsible=icon]:hidden">
              小西瓜
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Smart Filters */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {smartFilters.map((filter) => {
                  const badge = filter.getBadge?.(tasks)
                  const isActive =
                    filterView === filter.id &&
                    (filter.id !== 'category' || filterCategoryId === null)
                  return (
                    <SidebarMenuItem key={filter.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleFilterClick(filter.id)}
                        tooltip={filter.label}
                      >
                        {filter.icon}
                        <span>{filter.label}</span>
                      </SidebarMenuButton>
                      {badge !== undefined && badge > 0 && (
                        <SidebarMenuBadge>{badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Categories — spacing instead of separator for cleaner look */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  <FolderOpen className="mr-2 size-4" />
                  <span>分类</span>
                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <SidebarGroupAction onClick={handleAddCategory} title="添加分类" aria-label="添加分类">
                <Plus className="size-4" />
              </SidebarGroupAction>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {categories.length === 0 ? (
                      <SidebarMenuItem>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          暂无分类
                        </div>
                      </SidebarMenuItem>
                    ) : (
                      categories.map((category) => {
                        const count = getTaskCountForCategory(category.id)
                        const isActive =
                          filterView === 'category' && filterCategoryId === category.id
                        return (
                          <SidebarMenuItem key={category.id}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => handleCategoryClick(category.id)}
                              tooltip={category.name}
                            >
                              <div
                                className="size-3 rounded-full shrink-0"
                                style={{
                                  backgroundColor: category.color || '#94a3b8',
                                }}
                              />
                              <span>{category.name}</span>
                            </SidebarMenuButton>
                            {count > 0 && (
                              <SidebarMenuBadge>{count}</SidebarMenuBadge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction showOnHover>
                                  <MoreHorizontal className="size-4" />
                                </SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="right" align="start">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditCategory({
                                      id: category.id,
                                      name: category.name,
                                      color: category.color,
                                    })
                                  }
                                >
                                  <Pencil className="mr-2 size-4" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteCategory(category.id)}
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </SidebarMenuItem>
                        )
                      })
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          {/* Tags */}
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center">
                  <Tag className="mr-2 size-4" />
                  <span>标签</span>
                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {tags.length === 0 ? (
                      <SidebarMenuItem>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          暂无标签
                        </div>
                      </SidebarMenuItem>
                    ) : (
                      tags.map((tag) => {
                        const isActive = state.filterTagIds.includes(tag.id)
                        return (
                          <SidebarMenuItem key={tag.id}>
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() => handleTagClick(tag.id)}
                              tooltip={tag.name}
                            >
                              <div
                                className="size-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: tag.color || '#94a3b8',
                                }}
                              />
                              <span>{tag.name}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarContent>

        {/* Footer - Stats Entry */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={filterView === 'stats'}
                onClick={() => handleFilterClick('stats')}
                tooltip="统计"
              >
                <BarChart3 className="size-4" />
                <span>统计</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSubmit={handleCategoryDialogSubmit}
        initialName={editingCategory?.name}
        initialColor={editingCategory?.color}
        isEditing={!!editingCategory}
      />
    </>
  )
}
