import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  Task,
  Category,
  Tag,
  SubTask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubTaskInput,
  UpdateSubTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  TaskFilter,
  AppError,
  StatsSummary,
  DailyTrend,
  ReorderTaskItem,
} from '../../../shared/types'

// ============================================================
// Shared unwrap helper
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
// Query keys
// ============================================================

export const queryKeys = {
  tasks: ['tasks'] as const,
  taskById: (id: string) => ['tasks', id] as const,
  categories: ['categories'] as const,
  tags: ['tags'] as const,
  stats: (period: string) => ['stats', period] as const,
  dailyTrend: (days: number) => ['dailyTrend', days] as const,
}

// ============================================================
// Data queries
// ============================================================

export function useTasksQuery(): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => {
      const result = await window.api.getTasks()
      return unwrap(result)
    },
  })
}

export function useCategoriesQuery(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const result = await window.api.getCategories()
      return unwrap(result)
    },
  })
}

export function useTagsQuery(): UseQueryResult<Tag[]> {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: async () => {
      const result = await window.api.getTags()
      return unwrap(result)
    },
  })
}

// ============================================================
// Task mutations
// ============================================================

export function useCreateTask(): UseMutationResult<Task, Error, CreateTaskInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const result = await window.api.createTask(data)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useUpdateTask(): UseMutationResult<
  Task,
  Error,
  { id: string; data: UpdateTaskInput }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }) => {
      const result = await window.api.updateTask(id, data)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useDeleteTask(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.deleteTask(id)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useCompleteTask(): UseMutationResult<
  { completedTask: Task; nextTask?: Task },
  Error,
  string
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.completeTask(id)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useReorderTasks(): UseMutationResult<void, Error, ReorderTaskItem[]> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items: ReorderTaskItem[]) => {
      const result = await window.api.reorderTasks(items)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

// ============================================================
// Sub-task mutations
// ============================================================

export function useCreateSubTask(): UseMutationResult<
  SubTask,
  Error,
  { taskId: string; data: CreateSubTaskInput }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: CreateSubTaskInput }) => {
      const result = await window.api.createSubTask(taskId, data)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useUpdateSubTask(): UseMutationResult<
  SubTask,
  Error,
  { id: string; data: UpdateSubTaskInput }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSubTaskInput }) => {
      const result = await window.api.updateSubTask(id, data)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useDeleteSubTask(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.deleteSubTask(id)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

// ============================================================
// Category mutations
// ============================================================

export function useCreateCategory(): UseMutationResult<Category, Error, CreateCategoryInput> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const result = await window.api.createCategory(data)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
  })
}

export function useUpdateCategory(): UseMutationResult<
  Category,
  Error,
  { id: string; data: UpdateCategoryInput }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryInput }) => {
      const result = await window.api.updateCategory(id, data)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
    },
  })
}

export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.deleteCategory(id)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

// ============================================================
// Tag mutations
// ============================================================

export function useCreateTag(): UseMutationResult<
  Tag,
  Error,
  { name: string; color?: string }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const result = await window.api.createTag(name, color)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })
}

export function useUpdateTag(): UseMutationResult<
  Tag,
  Error,
  { id: string; name: string; color?: string }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color?: string }) => {
      const result = await window.api.updateTag(id, name, color)
      return unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })
}

export function useDeleteTag(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.deleteTag(id)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags })
    },
  })
}

export function useAddTagToTask(): UseMutationResult<
  void,
  Error,
  { taskId: string; tagId: string }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const result = await window.api.addTagToTask(taskId, tagId)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

export function useRemoveTagFromTask(): UseMutationResult<
  void,
  Error,
  { taskId: string; tagId: string }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, tagId }: { taskId: string; tagId: string }) => {
      const result = await window.api.removeTagFromTask(taskId, tagId)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
  })
}

// ============================================================
// Search
// ============================================================

export function useSearchTasks(): UseMutationResult<
  Task[],
  Error,
  { query: string; filters?: TaskFilter }
> {
  return useMutation({
    mutationFn: async ({ query, filters }: { query: string; filters?: TaskFilter }) => {
      const result = await window.api.searchTasks(query, filters)
      return unwrap(result)
    },
  })
}

// ============================================================
// Stats queries
// ============================================================

export function useStatsQuery(
  period: 'day' | 'week' | 'month'
): UseQueryResult<StatsSummary> {
  return useQuery({
    queryKey: queryKeys.stats(period),
    queryFn: async () => {
      const result = await window.api.getStats(period)
      return unwrap(result)
    },
  })
}

export function useDailyTrendQuery(days: number): UseQueryResult<DailyTrend[]> {
  return useQuery({
    queryKey: queryKeys.dailyTrend(days),
    queryFn: async () => {
      const result = await window.api.getDailyTrend(days)
      return unwrap(result)
    },
  })
}

// ============================================================
// Data import/export
// ============================================================

export function useExportData(): UseMutationResult<string, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const result = await window.api.exportData()
      return unwrap(result)
    },
  })
}

export function useImportData(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (jsonStr: string) => {
      const result = await window.api.importData(jsonStr)
      unwrap(result)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      queryClient.invalidateQueries({ queryKey: queryKeys.tags })
      toast.success('数据导入成功')
    },
  })
}
