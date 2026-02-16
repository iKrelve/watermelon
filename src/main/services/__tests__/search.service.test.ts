import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { SearchService } from '../search.service'
import { TaskService } from '../task.service'
import { TagService } from '../tag.service'
import { initTestDatabase } from '../../db'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../../db/schema'

let db: BetterSQLite3Database<typeof schema>
let searchService: SearchService
let taskService: TaskService
let tagService: TagService

beforeEach(() => {
  db = initTestDatabase()
  tagService = new TagService(db)
  taskService = new TaskService(db)
  searchService = new SearchService(db, tagService)
})

describe('SearchService Property Tests', () => {
  // Feature: todo-app, Property 16: Search case-insensitivity
  it('Property 16: Search is case-insensitive for task titles', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length >= 3 && /^[a-zA-Z]+$/.test(s.trim())),
        (title) => {
          // Create a task with a known title
          taskService.create({ title })

          // Search with different case permutations
          const lower = title.toLowerCase()
          const upper = title.toUpperCase()
          const original = title

          const resultsLower = searchService.search(lower)
          const resultsUpper = searchService.search(upper)
          const resultsOriginal = searchService.search(original)

          // All should find the task (SQLite LIKE is case-insensitive for ASCII by default)
          const containsTask = (results: typeof resultsLower) =>
            results.some((t) => t.title === title.trim())

          expect(containsTask(resultsLower)).toBe(true)
          expect(containsTask(resultsUpper)).toBe(true)
          expect(containsTask(resultsOriginal)).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  // Search with empty query returns all tasks
  it('Empty search returns all tasks', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
        // Re-init DB for each property run to avoid accumulation
        const freshDb = initTestDatabase()
        const freshTagService = new TagService(freshDb)
        const freshTaskService = new TaskService(freshDb)
        const freshSearchService = new SearchService(freshDb, freshTagService)

        for (let i = 0; i < count; i++) {
          freshTaskService.create({ title: `Task ${i}` })
        }

        const results = freshSearchService.search()
        expect(results.length).toBe(count)
      }),
      { numRuns: 20 }
    )
  })
})
