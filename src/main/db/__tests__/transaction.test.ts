import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { eq, count } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../schema'
import { tasks, subTasks, categories } from '../schema'

let db: BetterSQLite3Database<typeof schema>
let rawDb: Database.Database

function createTestDb(): { db: BetterSQLite3Database<typeof schema>; rawDb: Database.Database } {
  const rawDb = new Database(':memory:')
  rawDb.pragma('foreign_keys = ON')
  const db = drizzle(rawDb, { schema })

  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'none',
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      due_date TEXT,
      reminder_time TEXT,
      recurrence_rule TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sub_tasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );
  `)

  return { db, rawDb }
}

beforeEach(() => {
  const result = createTestDb()
  db = result.db
  rawDb = result.rawDb
})

describe('Transaction Atomicity Tests', () => {
  // Feature: todo-app, Property 20: Transaction atomicity
  it('Property 20: If any part of a multi-record operation fails, none of the modifications are persisted', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (subTaskCount) => {
          const now = new Date().toISOString()
          const taskId = uuidv4()

          // Create task with sub-tasks in a transaction
          const transaction = rawDb.transaction(() => {
            db.insert(tasks).values({
              id: taskId,
              title: 'Transaction Test Task',
              status: 'todo',
              priority: 'none',
              createdAt: now,
              updatedAt: now,
            }).run()

            for (let i = 0; i < subTaskCount; i++) {
              db.insert(subTasks).values({
                id: uuidv4(),
                taskId,
                title: `Sub-task ${i}`,
                completed: false,
                sortOrder: i,
                createdAt: now,
              }).run()
            }
          })

          transaction()

          // Verify all were created
          const taskResult = db.select().from(tasks).where(eq(tasks.id, taskId)).get()
          expect(taskResult).toBeDefined()

          const subTaskResults = db.select().from(subTasks).where(eq(subTasks.taskId, taskId)).all()
          expect(subTaskResults.length).toBe(subTaskCount)

          // Now test rollback: try to insert a task + sub-tasks where sub-task insertion fails
          const failTaskId = uuidv4()
          const failTransaction = rawDb.transaction(() => {
            db.insert(tasks).values({
              id: failTaskId,
              title: 'Should Rollback',
              status: 'todo',
              priority: 'none',
              createdAt: now,
              updatedAt: now,
            }).run()

            // This will fail because the task_id references a non-existent task
            db.insert(subTasks).values({
              id: uuidv4(),
              taskId: 'non-existent-task-id',
              title: 'This should fail',
              completed: false,
              sortOrder: 0,
              createdAt: now,
            }).run()
          })

          expect(() => failTransaction()).toThrow()

          // Verify the task was NOT created (rolled back)
          const failResult = db.select().from(tasks).where(eq(tasks.id, failTaskId)).get()
          expect(failResult).toBeUndefined()
        }
      ),
      { numRuns: 50 }
    )
  })

  // Feature: todo-app, Property 20 (extended): Category deletion with task nullification is atomic
  it('Property 20 (extended): Category deletion atomically nullifies all task references', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (taskCount) => {
          const now = new Date().toISOString()
          const categoryId = uuidv4()

          // Create category
          db.insert(categories).values({
            id: categoryId,
            name: `Category-${uuidv4().slice(0, 8)}`,
            sortOrder: 0,
            createdAt: now,
          }).run()

          // Create tasks in that category
          const taskIds: string[] = []
          for (let i = 0; i < taskCount; i++) {
            const id = uuidv4()
            taskIds.push(id)
            db.insert(tasks).values({
              id,
              title: `Task ${i}`,
              status: 'todo',
              priority: 'none',
              categoryId,
              createdAt: now,
              updatedAt: now,
            }).run()
          }

          // Delete category (ON DELETE SET NULL should nullify references)
          db.delete(categories).where(eq(categories.id, categoryId)).run()

          // All tasks should still exist but with null categoryId
          for (const tid of taskIds) {
            const task = db.select().from(tasks).where(eq(tasks.id, tid)).get()
            expect(task).toBeDefined()
            expect(task!.categoryId).toBeNull()
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
