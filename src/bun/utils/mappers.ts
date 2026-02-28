import { tasks, subTasks } from '../db/schema'
import type { Task, SubTask } from '../../shared/types'

/**
 * Convert a raw database task row to a domain Task object.
 * Shared across TaskService and SearchService.
 */
export function rowToTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    categoryId: row.categoryId,
    dueDate: row.dueDate,
    reminderTime: row.reminderTime,
    recurrenceRule: row.recurrenceRule ? JSON.parse(row.recurrenceRule) : null,
    completedAt: row.completedAt,
    sortOrder: row.sortOrder ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Convert a raw database sub-task row to a domain SubTask object.
 */
export function rowToSubTask(row: typeof subTasks.$inferSelect): SubTask {
  return {
    id: row.id,
    taskId: row.taskId,
    parentId: row.parentId ?? null,
    title: row.title,
    description: row.description ?? null,
    priority: (row.priority ?? 'none') as SubTask['priority'],
    dueDate: row.dueDate ?? null,
    completed: row.completed,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  }
}

/**
 * Build a tree of sub-tasks from a flat list.
 * Sub-tasks with parentId === null are top-level children of the task.
 * Each sub-task's `children` array contains its nested sub-tasks, sorted by sortOrder.
 */
export function buildSubTaskTree(flatSubTasks: SubTask[]): SubTask[] {
  const byId = new Map<string, SubTask>()
  for (const st of flatSubTasks) {
    byId.set(st.id, { ...st, children: [] })
  }

  const roots: SubTask[] = []
  for (const st of byId.values()) {
    if (st.parentId && byId.has(st.parentId)) {
      byId.get(st.parentId)!.children!.push(st)
    } else {
      roots.push(st)
    }
  }

  return roots
}