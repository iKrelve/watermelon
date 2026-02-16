import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { TagService } from '../tag.service'
import { TaskService } from '../task.service'
import { initTestDatabase } from '../../db/index'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../../db/schema'

let db: BetterSQLite3Database<typeof schema>
let tagService: TagService
let taskService: TaskService

beforeEach(() => {
  db = initTestDatabase()
  tagService = new TagService(db)
  taskService = new TaskService(db)
})

describe('TagService Property Tests', () => {
  // Feature: todo-app, Property 10: Tag multi-filter returns intersection
  it('Property 10: Filtering by multiple tags returns tasks with ALL selected tags', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.integer({ min: 3, max: 6 }),
        (tagCount, taskCount) => {
          // Create tags
          const createdTags = []
          for (let i = 0; i < tagCount; i++) {
            createdTags.push(tagService.create(`Tag-${Date.now()}-${i}-${Math.random()}`))
          }

          // Create tasks
          const createdTasks = []
          for (let i = 0; i < taskCount; i++) {
            createdTasks.push(taskService.create({ title: `Task ${i}` }))
          }

          // Assign tags to tasks with a known pattern:
          // Task 0 gets all tags
          // Task 1 gets first tag only
          // Task 2 gets first two tags
          // etc.
          for (let i = 0; i < taskCount; i++) {
            const tagsToAssign = Math.min(i + 1, tagCount)
            for (let j = 0; j < tagsToAssign; j++) {
              tagService.addToTask(createdTasks[i].id, createdTags[j].id)
            }
          }

          // Filter by all tags - should return tasks that have ALL tags
          const allTagIds = createdTags.map((t) => t.id)
          const matchingIds = tagService.findTaskIdsByTags(allTagIds)

          // Only tasks with index >= tagCount - 1 should match (they have all tags)
          for (const matchId of matchingIds) {
            // Verify this task actually has all the tags
            const taskTagsList = tagService.getTagsForTask(matchId)
            const taskTagIds = new Set(taskTagsList.map((t) => t.id))
            for (const tagId of allTagIds) {
              expect(taskTagIds.has(tagId)).toBe(true)
            }
          }

          // Filter by first tag only - should include more tasks
          const firstTagIds = [createdTags[0].id]
          const firstTagMatches = tagService.findTaskIdsByTags(firstTagIds)
          expect(firstTagMatches.length).toBeGreaterThanOrEqual(matchingIds.length)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Tag add/remove lifecycle
  it('Adding and removing a tag from a task is a round-trip', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // Just need to run repeatedly
        () => {
          const tag = tagService.create(`Tag-${Date.now()}-${Math.random()}`)
          const task = taskService.create({ title: 'Test Task' })

          // Initially no tags
          expect(tagService.getTagsForTask(task.id)).toHaveLength(0)

          // Add tag
          tagService.addToTask(task.id, tag.id)
          expect(tagService.getTagsForTask(task.id)).toHaveLength(1)

          // Add again (idempotent)
          tagService.addToTask(task.id, tag.id)
          expect(tagService.getTagsForTask(task.id)).toHaveLength(1)

          // Remove tag
          tagService.removeFromTask(task.id, tag.id)
          expect(tagService.getTagsForTask(task.id)).toHaveLength(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})
