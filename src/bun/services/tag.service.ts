import { eq, and, sql, inArray } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema'
import { tags, taskTags, tasks } from '../db/schema'
import type { Tag, Task } from '../../shared/types'

export class TagService {
  constructor(private db: BunSQLiteDatabase<typeof schema>) {}

  private rowToTag(row: typeof tags.$inferSelect): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt,
    }
  }

  create(name: string, color?: string): Tag {
    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Tag name must not be empty')
    }

    // Check for duplicate
    const existing = this.db
      .select()
      .from(tags)
      .where(eq(tags.name, name.trim()))
      .get()
    if (existing) {
      throw new Error('VALIDATION_ERROR: Tag name already exists')
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    const row = {
      id,
      name: name.trim(),
      color: color ?? null,
      createdAt: now,
    }

    this.db.insert(tags).values(row).run()
    return this.rowToTag(row)
  }

  update(id: string, name: string, color?: string): Tag {
    const existing = this.db.select().from(tags).where(eq(tags.id, id)).get()
    if (!existing) {
      throw new Error('NOT_FOUND: Tag not found')
    }

    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Tag name must not be empty')
    }

    // Check for duplicate name (excluding current tag)
    const duplicate = this.db
      .select()
      .from(tags)
      .where(and(eq(tags.name, name.trim()), sql`${tags.id} != ${id}`))
      .get()
    if (duplicate) {
      throw new Error('VALIDATION_ERROR: Tag name already exists')
    }

    const updates: Record<string, unknown> = { name: name.trim() }
    if (color !== undefined) updates.color = color ?? null

    this.db.update(tags).set(updates).where(eq(tags.id, id)).run()

    const updated = this.db.select().from(tags).where(eq(tags.id, id)).get()
    return this.rowToTag(updated!)
  }

  getAll(): Tag[] {
    return this.db
      .select()
      .from(tags)
      .orderBy(tags.name)
      .all()
      .map((r) => this.rowToTag(r))
  }

  getById(id: string): Tag | null {
    const row = this.db.select().from(tags).where(eq(tags.id, id)).get()
    return row ? this.rowToTag(row) : null
  }

  delete(id: string): void {
    // Task-tag associations are cascade-deleted
    this.db.delete(tags).where(eq(tags.id, id)).run()
  }

  addToTask(taskId: string, tagId: string): void {
    // Check if association already exists
    const existing = this.db
      .select()
      .from(taskTags)
      .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
      .get()

    if (existing) return // Already associated, idempotent

    this.db.insert(taskTags).values({ taskId, tagId }).run()
  }

  removeFromTask(taskId: string, tagId: string): void {
    this.db
      .delete(taskTags)
      .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
      .run()
  }

  getTagsForTask(taskId: string): Tag[] {
    const rows = this.db
      .select({ tag: tags })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(eq(taskTags.taskId, taskId))
      .all()
    return rows.map((r) => this.rowToTag(r.tag))
  }

  /**
   * Find tasks that have ALL of the specified tags.
   * Returns task IDs that match all tags (intersection).
   */
  findTaskIdsByTags(tagIds: string[]): string[] {
    if (tagIds.length === 0) return []

    // For each tag, find associated task IDs, then compute intersection
    const taskIdSets = tagIds.map((tagId) => {
      const rows = this.db
        .select({ taskId: taskTags.taskId })
        .from(taskTags)
        .where(eq(taskTags.tagId, tagId))
        .all()
      return new Set(rows.map((r) => r.taskId))
    })

    // Intersection of all sets
    let result = taskIdSets[0]
    for (let i = 1; i < taskIdSets.length; i++) {
      result = new Set([...result].filter((id) => taskIdSets[i].has(id)))
    }

    return [...result]
  }

  count(): number {
    const result = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tags)
      .get()
    return result?.count ?? 0
  }
}