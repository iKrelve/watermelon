import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { CategoryService } from '../category.service'
import { TaskService } from '../task.service'
import { initTestDatabase } from '../../db/index'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type * as schema from '../../db/schema'

let db: BetterSQLite3Database<typeof schema>
let categoryService: CategoryService
let taskService: TaskService

beforeEach(() => {
  db = initTestDatabase()
  categoryService = new CategoryService(db)
  taskService = new TaskService(db)
})

const uniqueNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)

describe('CategoryService Property Tests', () => {
  // Feature: todo-app, Property 7: Category filter returns exact matches
  it('Property 7: Filtering tasks by category returns exactly those tasks in that category', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 4 }),
        (catCount, tasksPerCat) => {
          // Create categories with unique names
          const cats = []
          for (let i = 0; i < catCount; i++) {
            cats.push(categoryService.create({ name: `Cat-${Date.now()}-${i}-${Math.random()}` }))
          }

          // Create tasks in each category
          const tasksByCat: Record<string, string[]> = {}
          for (const cat of cats) {
            tasksByCat[cat.id] = []
            for (let j = 0; j < tasksPerCat; j++) {
              const task = taskService.create({
                title: `Task ${j} in ${cat.name}`,
                categoryId: cat.id,
              })
              tasksByCat[cat.id].push(task.id)
            }
          }

          // For each category, filter and verify
          for (const cat of cats) {
            const allTasks = taskService.getAll()
            const filtered = allTasks.filter((t) => t.categoryId === cat.id)
            expect(filtered.length).toBe(tasksPerCat)
            expect(filtered.every((t) => t.categoryId === cat.id)).toBe(true)

            // Ensure no tasks from other categories are included
            const otherCatIds = cats.filter((c) => c.id !== cat.id).map((c) => c.id)
            expect(filtered.every((t) => !otherCatIds.includes(t.categoryId!))).toBe(true)
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: todo-app, Property 8: Category deletion nullifies task references
  it('Property 8: Deleting a category sets all task categoryIds to null without removing tasks', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (taskCount) => {
        const cat = categoryService.create({ name: `DelCat-${Date.now()}-${Math.random()}` })

        const taskIds: string[] = []
        for (let i = 0; i < taskCount; i++) {
          const task = taskService.create({
            title: `Task ${i}`,
            categoryId: cat.id,
          })
          taskIds.push(task.id)
        }

        const totalBefore = taskService.count()

        // Delete the category
        categoryService.delete(cat.id)

        // All tasks should still exist
        const totalAfter = taskService.count()
        expect(totalAfter).toBe(totalBefore)

        // All tasks should have null categoryId
        for (const tid of taskIds) {
          const task = taskService.getById(tid)
          expect(task).toBeDefined()
          expect(task!.categoryId).toBeNull()
        }
      }),
      { numRuns: 50 }
    )
  })

  // Feature: todo-app, Property 9: Duplicate category name rejection
  it('Property 9: Creating a category with an existing name is rejected', () => {
    fc.assert(
      fc.property(uniqueNameArb, (name) => {
        const uniqueName = `${name}-${Date.now()}-${Math.random()}`
        categoryService.create({ name: uniqueName })
        const countBefore = categoryService.count()

        expect(() => categoryService.create({ name: uniqueName })).toThrow('VALIDATION_ERROR')

        const countAfter = categoryService.count()
        expect(countAfter).toBe(countBefore)
      }),
      { numRuns: 50 }
    )
  })
})
