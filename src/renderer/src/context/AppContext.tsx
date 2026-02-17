import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type {
  Task,
  Category,
  Tag,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
  AppError,
  SubTask,
  StatsSummary,
  DailyTrend,
} from '../../../shared/types'

// ============================================================
// Types
// ============================================================

export type FilterView = 'all' | 'today' | 'upcoming' | 'completed' | 'category' | 'tag' | 'stats'

interface AppState {
  tasks: Task[]
  categories: Category[]
  tags: Tag[]
  selectedTaskId: string | null
  filterView: FilterView
  filterCategoryId: string | null
  filterTagIds: string[]
  searchQuery: string
  compactMode: boolean
  commandPaletteOpen: boolean
  loading: boolean
  error: AppError | null
}

type AppAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'REMOVE_TASK'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'REMOVE_CATEGORY'; payload: string }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'UPDATE_TAG'; payload: Tag }
  | { type: 'REMOVE_TAG'; payload: string }
  | { type: 'SELECT_TASK'; payload: string | null }
  | { type: 'SET_FILTER_VIEW'; payload: FilterView }
  | { type: 'SET_FILTER_CATEGORY'; payload: string | null }
  | { type: 'SET_FILTER_TAGS'; payload: string[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AppError | null }
  | { type: 'TOGGLE_COMPACT_MODE' }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'SET_COMMAND_PALETTE'; payload: boolean }

// ============================================================
// Reducer
// ============================================================

const initialState: AppState = {
  tasks: [],
  categories: [],
  tags: [],
  selectedTaskId: null,
  filterView: 'all',
  filterCategoryId: null,
  filterTagIds: [],
  searchQuery: '',
  compactMode: localStorage.getItem('watermelon:compactMode') === 'true',
  commandPaletteOpen: false,
  loading: true,
  error: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload }
    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      }
    case 'REMOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
        selectedTaskId: state.selectedTaskId === action.payload ? null : state.selectedTaskId,
      }
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload }
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] }
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      }
    case 'REMOVE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      }
    case 'SET_TAGS':
      return { ...state, tags: action.payload }
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] }
    case 'UPDATE_TAG':
      return {
        ...state,
        tags: state.tags.map((t) => (t.id === action.payload.id ? action.payload : t)),
      }
    case 'REMOVE_TAG':
      return { ...state, tags: state.tags.filter((t) => t.id !== action.payload) }
    case 'SELECT_TASK':
      return { ...state, selectedTaskId: action.payload }
    case 'SET_FILTER_VIEW':
      return { ...state, filterView: action.payload, selectedTaskId: null }
    case 'SET_FILTER_CATEGORY':
      return {
        ...state,
        filterCategoryId: action.payload,
        filterView: action.payload !== null ? 'category' : state.filterView,
        selectedTaskId: null,
      }
    case 'SET_FILTER_TAGS':
      return { ...state, filterTagIds: action.payload }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'TOGGLE_COMPACT_MODE': {
      const next = !state.compactMode
      localStorage.setItem('watermelon:compactMode', String(next))
      // Resize window via main process
      window.api.setCompactMode(next)
      return { ...state, compactMode: next }
    }
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen }
    case 'SET_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: action.payload }
    default:
      return state
  }
}

// ============================================================
// Helper: Unwrap API result
// ============================================================

function unwrap<T>(result: T | { __error: AppError }): T {
  if (result && typeof result === 'object' && '__error' in result) {
    const error = (result as { __error: AppError }).__error
    toast.error(error.message || '操作失败')
    throw error
  }
  return result as T
}

// ============================================================
// Contexts — split state and actions for performance
// ============================================================

/** Read-only state context. Components that only read state subscribe here. */
const AppStateContext = createContext<AppState | null>(null)

/** Actions context. Stable references — doesn't trigger re-renders on state change. */
interface AppActions {
  dispatch: React.Dispatch<AppAction>
  // Task actions
  createTask: (data: CreateTaskInput) => Promise<Task>
  updateTask: (id: string, data: UpdateTaskInput) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  refreshTasks: () => Promise<void>
  // Sub-task actions
  createSubTask: (taskId: string, data: CreateSubTaskInput) => Promise<SubTask>
  updateSubTask: (id: string, data: UpdateSubTaskInput) => Promise<SubTask>
  deleteSubTask: (id: string) => Promise<void>
  // Category actions
  createCategory: (data: CreateCategoryInput) => Promise<Category>
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  // Tag actions
  createTag: (name: string, color?: string) => Promise<Tag>
  updateTag: (id: string, name: string, color?: string) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  addTagToTask: (taskId: string, tagId: string) => Promise<void>
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>
  // Search
  searchTasks: (query: string, filters?: TaskFilter) => Promise<Task[]>
  // Stats
  getStats: (period: 'day' | 'week' | 'month') => Promise<StatsSummary>
  getDailyTrend: (days: number) => Promise<DailyTrend[]>
  // Data management
  exportData: () => Promise<string>
  importData: (jsonStr: string) => Promise<void>
}

const AppActionsContext = createContext<AppActions | null>(null)

// ============================================================
// Legacy combined context (for backward compatibility with useApp())
// ============================================================

type AppContextValue = AppActions & { state: AppState }

// ============================================================
// Provider
// ============================================================

export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Load initial data
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })

        const [tasksResult, categoriesResult, tagsResult] = await Promise.all([
          window.api.getTasks(),
          window.api.getCategories(),
          window.api.getTags(),
        ])

        dispatch({ type: 'SET_TASKS', payload: unwrap(tasksResult) })
        dispatch({ type: 'SET_CATEGORIES', payload: unwrap(categoriesResult) })
        dispatch({ type: 'SET_TAGS', payload: unwrap(tagsResult) })
      } catch (error) {
        const message = error instanceof Error ? error.message : '加载数据失败'
        toast.error(message)
        dispatch({
          type: 'SET_ERROR',
          payload: { code: 'LOAD_ERROR', message },
        })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
    loadData()
  }, [])

  // Task actions
  const createTask = useCallback(async (data: CreateTaskInput): Promise<Task> => {
    const result = await window.api.createTask(data)
    const task = unwrap(result)
    dispatch({ type: 'ADD_TASK', payload: task })
    return task
  }, [])

  const updateTask = useCallback(async (id: string, data: UpdateTaskInput): Promise<Task> => {
    const result = await window.api.updateTask(id, data)
    const task = unwrap(result)
    dispatch({ type: 'UPDATE_TASK', payload: task })
    return task
  }, [])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const result = await window.api.deleteTask(id)
    unwrap(result)
    dispatch({ type: 'REMOVE_TASK', payload: id })
  }, [])

  const completeTask = useCallback(async (id: string): Promise<void> => {
    const result = await window.api.completeTask(id)
    const { completedTask, nextTask } = unwrap(result)
    dispatch({ type: 'UPDATE_TASK', payload: completedTask })
    if (nextTask) {
      dispatch({ type: 'ADD_TASK', payload: nextTask })
    }
  }, [])

  const refreshTasks = useCallback(async (): Promise<void> => {
    const result = await window.api.getTasks()
    dispatch({ type: 'SET_TASKS', payload: unwrap(result) })
  }, [])

  // Sub-task actions
  const createSubTask = useCallback(async (taskId: string, data: CreateSubTaskInput): Promise<SubTask> => {
    const result = await window.api.createSubTask(taskId, data)
    const subTask = unwrap(result)
    // Refresh the parent task to get updated sub-tasks
    const taskResult = await window.api.getTaskById(taskId)
    const task = unwrap(taskResult)
    if (task) dispatch({ type: 'UPDATE_TASK', payload: task })
    return subTask
  }, [])

  const updateSubTask = useCallback(async (id: string, data: UpdateSubTaskInput): Promise<SubTask> => {
    const result = await window.api.updateSubTask(id, data)
    return unwrap(result)
  }, [])

  const deleteSubTask = useCallback(async (id: string): Promise<void> => {
    const result = await window.api.deleteSubTask(id)
    unwrap(result)
  }, [])

  // Category actions
  const createCategory = useCallback(async (data: CreateCategoryInput): Promise<Category> => {
    const result = await window.api.createCategory(data)
    const category = unwrap(result)
    dispatch({ type: 'ADD_CATEGORY', payload: category })
    return category
  }, [])

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryInput): Promise<Category> => {
    const result = await window.api.updateCategory(id, data)
    const category = unwrap(result)
    dispatch({ type: 'UPDATE_CATEGORY', payload: category })
    return category
  }, [])

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    const result = await window.api.deleteCategory(id)
    unwrap(result)
    dispatch({ type: 'REMOVE_CATEGORY', payload: id })
    await refreshTasks()
  }, [refreshTasks])

  // Tag actions
  const createTag = useCallback(async (name: string, color?: string): Promise<Tag> => {
    const result = await window.api.createTag(name, color)
    const tag = unwrap(result)
    dispatch({ type: 'ADD_TAG', payload: tag })
    return tag
  }, [])

  const updateTag = useCallback(async (id: string, name: string, color?: string): Promise<Tag> => {
    const result = await window.api.updateTag(id, name, color)
    const tag = unwrap(result)
    dispatch({ type: 'UPDATE_TAG', payload: tag })
    return tag
  }, [])

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    const result = await window.api.deleteTag(id)
    unwrap(result)
    dispatch({ type: 'REMOVE_TAG', payload: id })
  }, [])

  const addTagToTask = useCallback(async (taskId: string, tagId: string): Promise<void> => {
    const result = await window.api.addTagToTask(taskId, tagId)
    unwrap(result)
    // Refresh the task to get updated tags
    const taskResult = await window.api.getTaskById(taskId)
    const task = unwrap(taskResult)
    if (task) dispatch({ type: 'UPDATE_TASK', payload: task })
  }, [])

  const removeTagFromTask = useCallback(async (taskId: string, tagId: string): Promise<void> => {
    const result = await window.api.removeTagFromTask(taskId, tagId)
    unwrap(result)
    const taskResult = await window.api.getTaskById(taskId)
    const task = unwrap(taskResult)
    if (task) dispatch({ type: 'UPDATE_TASK', payload: task })
  }, [])

  // Search
  const searchTasks = useCallback(async (query: string, filters?: TaskFilter): Promise<Task[]> => {
    const result = await window.api.searchTasks(query, filters)
    return unwrap(result)
  }, [])

  // Stats
  const getStats = useCallback(async (period: 'day' | 'week' | 'month'): Promise<StatsSummary> => {
    const result = await window.api.getStats(period)
    return unwrap(result)
  }, [])

  const getDailyTrend = useCallback(async (days: number): Promise<DailyTrend[]> => {
    const result = await window.api.getDailyTrend(days)
    return unwrap(result)
  }, [])

  // Data management
  const exportData = useCallback(async (): Promise<string> => {
    const result = await window.api.exportData()
    return unwrap(result)
  }, [])

  const importData = useCallback(async (jsonStr: string): Promise<void> => {
    const result = await window.api.importData(jsonStr)
    unwrap(result)
    await refreshTasks()
    // Refresh categories and tags too
    const [categoriesResult, tagsResult] = await Promise.all([
      window.api.getCategories(),
      window.api.getTags(),
    ])
    dispatch({ type: 'SET_CATEGORIES', payload: unwrap(categoriesResult) })
    dispatch({ type: 'SET_TAGS', payload: unwrap(tagsResult) })
    toast.success('数据导入成功')
  }, [refreshTasks])

  // Stable actions object
  const actions: AppActions = useMemo(
    () => ({
      dispatch,
      createTask,
      updateTask,
      deleteTask,
      completeTask,
      refreshTasks,
      createSubTask,
      updateSubTask,
      deleteSubTask,
      createCategory,
      updateCategory,
      deleteCategory,
      createTag,
      updateTag,
      deleteTag,
      addTagToTask,
      removeTagFromTask,
      searchTasks,
      getStats,
      getDailyTrend,
      exportData,
      importData,
    }),
    [
      createTask, updateTask, deleteTask, completeTask, refreshTasks,
      createSubTask, updateSubTask, deleteSubTask,
      createCategory, updateCategory, deleteCategory,
      createTag, updateTag, deleteTag, addTagToTask, removeTagFromTask,
      searchTasks, getStats, getDailyTrend, exportData, importData,
    ]
  )

  return (
    <AppActionsContext.Provider value={actions}>
      <AppStateContext.Provider value={state}>
        {children}
      </AppStateContext.Provider>
    </AppActionsContext.Provider>
  )
}

// ============================================================
// Hooks
// ============================================================

/** Use state only — doesn't re-render when actions change (they never do). */
export function useAppState(): AppState {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

/** Use actions only — stable refs, components using only actions won't re-render on state changes. */
export function useAppActions(): AppActions {
  const ctx = useContext(AppActionsContext)
  if (!ctx) throw new Error('useAppActions must be used within AppProvider')
  return ctx
}

/** Legacy combined hook — use useAppState()/useAppActions() for better perf. */
export function useApp(): AppContextValue {
  const state = useAppState()
  const actions = useAppActions()
  return { state, ...actions }
}