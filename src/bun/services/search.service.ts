import { eq, and, sql, like, or, inArray, gte, lte, desc, asc } from 'drizzle-orm'
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema'
import { tasks, taskTags } from '../db/schema'
import type { Task, TaskFilter } from '../../shared/types'
import { TagService } from './tag.service'
import { rowToTask } from '../utils/mappers'

export class SearchService {
  constructor(
    private db: BunSQLiteDatabase<typeof schema>,
    private tagService: TagService
  ) {}

  /**
   * Search tasks by text query and/or filters.
   * Text search is case-insensitive using LIKE.
   * Multiple filters are combined as intersection (AND).
   */
  search(query?: string, filters?: TaskFilter): Task[] {
    const conditions: ReturnType<typeof eq>[] = []

    // Text search (case-insensitive)
    if (query && query.trim().length > 0) {
      const searchTerm = `%${query.trim()}%`
      conditions.push(
        or(
          like(tasks.title, searchTerm),
          like(tasks.description, searchTerm)
        )!
      )
    }

    // Status filter
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status))
    }

    // Category filter
    if (filters?.categoryId !== undefined) {
      if (filters.categoryId === null) {
        conditions.push(sql`${tasks.categoryId} IS NULL`)
      } else {
        conditions.push(eq(tasks.categoryId, filters.categoryId))
      }
    }

    // Priority filter
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority))
    }

    // Due date range filter
    if (filters?.dueDateFrom) {
      conditions.push(gte(tasks.dueDate, filters.dueDateFrom))
    }
    if (filters?.dueDateTo) {
      conditions.push(lte(tasks.dueDate, filters.dueDateTo))
    }

    // Build and execute query
    let queryBuilder = this.db.select().from(tasks)

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions)) as typeof queryBuilder
    }

    // Sort
    const sortBy = filters?.sortBy ?? 'createdAt'
    const sortOrder = filters?.sortOrder ?? 'desc'

    const priorityOrder = sql`CASE ${tasks.priority} 
      WHEN 'high' THEN 0 
      WHEN 'medium' THEN 1 
      WHEN 'low' THEN 2 
      WHEN 'none' THEN 3 
    END`

    let sortCol: ReturnType<typeof asc>
    if (sortBy === 'priority') {
      sortCol = sortOrder === 'asc' ? asc(priorityOrder) : desc(priorityOrder)
    } else if (sortBy === 'dueDate') {
      sortCol = sortOrder === 'asc' ? asc(tasks.dueDate) : desc(tasks.dueDate)
    } else {
      sortCol = sortOrder === 'asc' ? asc(tasks.createdAt) : desc(tasks.createdAt)
    }

    const rows = (queryBuilder as typeof queryBuilder).orderBy(sortCol).all()
    let results = rows.map((r) => rowToTask(r))

    // Tag filter (post-query filtering since it requires join logic)
    if (filters?.tagIds && filters.tagIds.length > 0) {
      const matchingTaskIds = new Set(this.tagService.findTaskIdsByTags(filters.tagIds))
      results = results.filter((t) => matchingTaskIds.has(t.id))
    }

    return results
  }
}