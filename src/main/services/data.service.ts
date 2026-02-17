import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema'
import { tasks, subTasks, categories, tags, taskTags } from '../db/schema'

interface ExportData {
  version: 1
  exportedAt: string
  tasks: (typeof tasks.$inferSelect)[]
  subTasks: (typeof subTasks.$inferSelect)[]
  categories: (typeof categories.$inferSelect)[]
  tags: (typeof tags.$inferSelect)[]
  taskTags: { taskId: string; tagId: string }[]
}

export class DataService {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Export all data as a JSON string.
   */
  exportData(): string {
    const allTasks = this.db.select().from(tasks).all()
    const allSubTasks = this.db.select().from(subTasks).all()
    const allCategories = this.db.select().from(categories).all()
    const allTags = this.db.select().from(tags).all()
    const allTaskTags = this.db
      .select({ taskId: taskTags.taskId, tagId: taskTags.tagId })
      .from(taskTags)
      .all()

    const data: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: allTasks,
      subTasks: allSubTasks,
      categories: allCategories,
      tags: allTags,
      taskTags: allTaskTags,
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Import data from a JSON string.
   * Merges with existing data — existing records with same ID are skipped.
   */
  importData(jsonStr: string): void {
    let data: ExportData

    try {
      data = JSON.parse(jsonStr)
    } catch {
      throw new Error('VALIDATION_ERROR: Invalid JSON format')
    }

    if (!data.version || data.version !== 1) {
      throw new Error('VALIDATION_ERROR: Unsupported export version')
    }

    // Import categories first (tasks reference them)
    for (const cat of data.categories ?? []) {
      try {
        this.db.insert(categories).values(cat).run()
      } catch {
        // Skip duplicates (UNIQUE constraint)
      }
    }

    // Import tags
    for (const tag of data.tags ?? []) {
      try {
        this.db.insert(tags).values(tag).run()
      } catch {
        // Skip duplicates
      }
    }

    // Import tasks
    for (const task of data.tasks ?? []) {
      try {
        this.db.insert(tasks).values(task).run()
      } catch {
        // Skip duplicates
      }
    }

    // Import sub-tasks
    for (const st of data.subTasks ?? []) {
      try {
        this.db.insert(subTasks).values(st).run()
      } catch {
        // Skip duplicates
      }
    }

    // Import task-tag associations
    for (const tt of data.taskTags ?? []) {
      try {
        this.db.insert(taskTags).values(tt).run()
      } catch {
        // Skip duplicates
      }
    }
  }
}