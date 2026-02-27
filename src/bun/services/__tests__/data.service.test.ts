import { describe, it, expect, beforeEach } from 'vitest'
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import { initTestDatabase } from '../../db/index'
import * as schema from '../../db/schema'
import { tasks, subTasks, categories, tags, taskTags } from '../../db/schema'
import { DataService } from '../data.service'
import { AppException } from '@shared/types'

let db: BunSQLiteDatabase<typeof schema>
let service: DataService

beforeEach(() => {
  db = initTestDatabase()
  service = new DataService(db)
})

// ============================================================
// Helpers
// ============================================================

const NOW = new Date().toISOString()

function seedFullDatabase(): void {
  db.insert(categories)
    .values({ id: 'cat-1', name: 'Work', color: '#ff0000', sortOrder: 0, createdAt: NOW })
    .run()
  db.insert(categories)
    .values({ id: 'cat-2', name: 'Personal', color: '#00ff00', sortOrder: 1, createdAt: NOW })
    .run()

  db.insert(tags)
    .values({ id: 'tag-1', name: 'Urgent', color: '#f00', createdAt: NOW })
    .run()
  db.insert(tags)
    .values({ id: 'tag-2', name: 'Low Priority', color: '#0f0', createdAt: NOW })
    .run()

  db.insert(tasks)
    .values({
      id: 'task-1',
      title: 'Task One',
      description: 'First task',
      status: 'todo',
      priority: 'high',
      categoryId: 'cat-1',
      dueDate: '2025-12-31',
      sortOrder: 0,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run()
  db.insert(tasks)
    .values({
      id: 'task-2',
      title: 'Task Two',
      status: 'completed',
      priority: 'low',
      completedAt: NOW,
      sortOrder: 1,
      createdAt: NOW,
      updatedAt: NOW,
    })
    .run()

  db.insert(subTasks)
    .values({
      id: 'sub-1',
      taskId: 'task-1',
      title: 'Subtask A',
      completed: false,
      sortOrder: 0,
      createdAt: NOW,
    })
    .run()

  db.insert(taskTags).values({ taskId: 'task-1', tagId: 'tag-1' }).run()
  db.insert(taskTags).values({ taskId: 'task-1', tagId: 'tag-2' }).run()
}

// ============================================================
// exportData()
// ============================================================

describe('DataService.exportData', () => {
  it('exports empty database as valid JSON with version 1', () => {
    const json = service.exportData()
    const data = JSON.parse(json)
    expect(data.version).toBe(1)
    expect(data.exportedAt).toBeDefined()
    expect(data.tasks).toEqual([])
    expect(data.subTasks).toEqual([])
    expect(data.categories).toEqual([])
    expect(data.tags).toEqual([])
    expect(data.taskTags).toEqual([])
  })

  it('exports all data from a seeded database', () => {
    seedFullDatabase()
    const json = service.exportData()
    const data = JSON.parse(json)

    expect(data.version).toBe(1)
    expect(data.categories).toHaveLength(2)
    expect(data.tags).toHaveLength(2)
    expect(data.tasks).toHaveLength(2)
    expect(data.subTasks).toHaveLength(1)
    expect(data.taskTags).toHaveLength(2)
  })

  it('exported data preserves field values', () => {
    seedFullDatabase()
    const json = service.exportData()
    const data = JSON.parse(json)

    const task1 = data.tasks.find((t: { id: string }) => t.id === 'task-1')
    expect(task1.title).toBe('Task One')
    expect(task1.description).toBe('First task')
    expect(task1.priority).toBe('high')
    expect(task1.categoryId).toBe('cat-1')

    const cat1 = data.categories.find((c: { id: string }) => c.id === 'cat-1')
    expect(cat1.name).toBe('Work')
    expect(cat1.color).toBe('#ff0000')
  })
})

// ============================================================
// importData() – validation
// ============================================================

describe('DataService.importData – validation', () => {
  it('throws VALIDATION_ERROR for invalid JSON', () => {
    expect(() => service.importData('not valid json {')).toThrow(AppException)
    try {
      service.importData('not valid json {')
    } catch (e) {
      expect((e as AppException).code).toBe('VALIDATION_ERROR')
      expect((e as AppException).message).toBe('Invalid JSON format')
    }
  })

  it('throws VALIDATION_ERROR for missing version', () => {
    const data = JSON.stringify({ exportedAt: NOW, tasks: [], subTasks: [], categories: [], tags: [], taskTags: [] })
    expect(() => service.importData(data)).toThrow(AppException)
    try {
      service.importData(data)
    } catch (e) {
      expect((e as AppException).code).toBe('VALIDATION_ERROR')
      expect((e as AppException).message).toBe('Unsupported export version')
    }
  })

  it('throws VALIDATION_ERROR for wrong version', () => {
    const data = JSON.stringify({
      version: 2,
      exportedAt: NOW,
      tasks: [],
      subTasks: [],
      categories: [],
      tags: [],
      taskTags: [],
    })
    expect(() => service.importData(data)).toThrow(AppException)
  })
})

// ============================================================
// importData() – core functionality
// ============================================================

describe('DataService.importData – import', () => {
  it('imports into an empty database', () => {
    const exportJson = JSON.stringify({
      version: 1,
      exportedAt: NOW,
      categories: [{ id: 'cat-1', name: 'Work', color: '#f00', sortOrder: 0, createdAt: NOW }],
      tags: [{ id: 'tag-1', name: 'Urgent', color: '#0f0', createdAt: NOW }],
      tasks: [
        {
          id: 'task-1',
          title: 'Imported Task',
          status: 'todo',
          priority: 'high',
          categoryId: 'cat-1',
          sortOrder: 0,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      subTasks: [
        {
          id: 'sub-1',
          taskId: 'task-1',
          title: 'Imported Sub',
          completed: false,
          sortOrder: 0,
          createdAt: NOW,
        },
      ],
      taskTags: [{ taskId: 'task-1', tagId: 'tag-1' }],
    })

    service.importData(exportJson)

    expect(db.select().from(categories).all()).toHaveLength(1)
    expect(db.select().from(tags).all()).toHaveLength(1)
    expect(db.select().from(tasks).all()).toHaveLength(1)
    expect(db.select().from(subTasks).all()).toHaveLength(1)
    expect(db.select().from(taskTags).all()).toHaveLength(1)

    const importedTask = db.select().from(tasks).all()[0]
    expect(importedTask.title).toBe('Imported Task')
    expect(importedTask.categoryId).toBe('cat-1')
  })

  it('skips duplicate records gracefully', () => {
    seedFullDatabase()
    const exportJson = service.exportData()

    // Import the same data again — should not throw
    expect(() => service.importData(exportJson)).not.toThrow()

    // Counts should remain the same
    expect(db.select().from(categories).all()).toHaveLength(2)
    expect(db.select().from(tags).all()).toHaveLength(2)
    expect(db.select().from(tasks).all()).toHaveLength(2)
    expect(db.select().from(subTasks).all()).toHaveLength(1)
    expect(db.select().from(taskTags).all()).toHaveLength(2)
  })

  it('merges new data with existing data', () => {
    // Seed with some data
    db.insert(categories)
      .values({ id: 'cat-existing', name: 'Existing', color: '#000', sortOrder: 0, createdAt: NOW })
      .run()

    // Import new data
    const importJson = JSON.stringify({
      version: 1,
      exportedAt: NOW,
      categories: [
        { id: 'cat-existing', name: 'Existing', color: '#000', sortOrder: 0, createdAt: NOW },
        { id: 'cat-new', name: 'New Category', color: '#fff', sortOrder: 1, createdAt: NOW },
      ],
      tags: [],
      tasks: [],
      subTasks: [],
      taskTags: [],
    })

    service.importData(importJson)

    const allCats = db.select().from(categories).all()
    expect(allCats).toHaveLength(2)
    expect(allCats.map((c) => c.id).sort()).toEqual(['cat-existing', 'cat-new'])
  })

  it('handles missing optional arrays gracefully', () => {
    const minimalJson = JSON.stringify({
      version: 1,
      exportedAt: NOW,
    })

    // Should not throw even with no arrays
    expect(() => service.importData(minimalJson)).not.toThrow()
    expect(db.select().from(tasks).all()).toHaveLength(0)
  })
})

// ============================================================
// Round-trip: export → import
// ============================================================

describe('DataService – export/import round-trip', () => {
  it('preserves all data through a round-trip', () => {
    seedFullDatabase()

    // Export from seeded DB
    const exported = service.exportData()
    const exportedData = JSON.parse(exported)

    // Import into a fresh DB
    const freshDb = initTestDatabase()
    const freshService = new DataService(freshDb)
    freshService.importData(exported)

    // Re-export from fresh DB
    const reExported = freshService.exportData()
    const reExportedData = JSON.parse(reExported)

    // Compare data (ignoring exportedAt which will differ)
    expect(reExportedData.version).toBe(exportedData.version)
    expect(reExportedData.categories).toEqual(exportedData.categories)
    expect(reExportedData.tags).toEqual(exportedData.tags)
    expect(reExportedData.tasks).toEqual(exportedData.tasks)
    expect(reExportedData.subTasks).toEqual(exportedData.subTasks)
    expect(reExportedData.taskTags).toEqual(exportedData.taskTags)
  })

  it('handles complex data with all field types populated', () => {
    const now = new Date().toISOString()

    db.insert(categories)
      .values({ id: 'cat-a', name: 'Cat A', color: '#abcdef', sortOrder: 5, createdAt: now })
      .run()
    db.insert(tags)
      .values({ id: 'tag-a', name: 'Tag A', color: null, createdAt: now })
      .run()
    db.insert(tasks)
      .values({
        id: 'task-complex',
        title: 'Complex Task',
        description: 'Has all fields',
        status: 'todo',
        priority: 'medium',
        categoryId: 'cat-a',
        dueDate: '2025-12-25',
        reminderTime: '2025-12-25T08:00:00Z',
        recurrenceRule: JSON.stringify({ type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] }),
        completedAt: null,
        sortOrder: 42,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    db.insert(subTasks)
      .values({
        id: 'sub-complex',
        taskId: 'task-complex',
        title: 'Complex Sub',
        description: 'Sub desc',
        priority: 'high',
        dueDate: '2025-12-20',
        completed: true,
        sortOrder: 3,
        createdAt: now,
      })
      .run()
    db.insert(taskTags).values({ taskId: 'task-complex', tagId: 'tag-a' }).run()

    // Round-trip
    const exported = service.exportData()
    const freshDb = initTestDatabase()
    const freshService = new DataService(freshDb)
    freshService.importData(exported)

    // Verify specific fields
    const importedTask = freshDb.select().from(tasks).all()[0]
    expect(importedTask.title).toBe('Complex Task')
    expect(importedTask.description).toBe('Has all fields')
    expect(importedTask.recurrenceRule).toBe(
      JSON.stringify({ type: 'weekly', interval: 1, daysOfWeek: [1, 3, 5] })
    )
    expect(importedTask.sortOrder).toBe(42)

    const importedSub = freshDb.select().from(subTasks).all()[0]
    expect(importedSub.description).toBe('Sub desc')
    expect(importedSub.priority).toBe('high')
    expect(importedSub.completed).toBe(true)
  })
})
