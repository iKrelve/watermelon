import { eq, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from '../db/schema'
import { categories, tasks } from '../db/schema'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../shared/types'
import { AppException } from '../../shared/types'

export class CategoryService {
  constructor(private db: BunSQLiteDatabase<typeof schema>) {}

  private rowToCategory(row: typeof categories.$inferSelect): Category {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    }
  }

  create(input: CreateCategoryInput): Category {
    if (!input.name || input.name.trim().length === 0) {
      throw new AppException('VALIDATION_ERROR', 'Category name must not be empty')
    }

    // Check for duplicate name
    const existing = this.db
      .select()
      .from(categories)
      .where(eq(categories.name, input.name.trim()))
      .get()
    if (existing) {
      throw new AppException('VALIDATION_ERROR', 'Category name already exists')
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    // Get max sort order
    const maxOrder = this.db
      .select({ max: sql<number>`MAX(${categories.sortOrder})` })
      .from(categories)
      .get()

    const row = {
      id,
      name: input.name.trim(),
      color: input.color ?? null,
      sortOrder: (maxOrder?.max ?? -1) + 1,
      createdAt: now,
    }

    this.db.insert(categories).values(row).run()
    return this.rowToCategory(row)
  }

  getAll(): Category[] {
    const rows = this.db
      .select()
      .from(categories)
      .orderBy(categories.sortOrder)
      .all()
    return rows.map((r) => this.rowToCategory(r))
  }

  getById(id: string): Category | null {
    const row = this.db.select().from(categories).where(eq(categories.id, id)).get()
    return row ? this.rowToCategory(row) : null
  }

  update(id: string, input: UpdateCategoryInput): Category {
    const existing = this.db.select().from(categories).where(eq(categories.id, id)).get()
    if (!existing) {
      throw new AppException('NOT_FOUND', 'Category not found')
    }

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new AppException('VALIDATION_ERROR', 'Category name must not be empty')
      }
      // Check duplicate (excluding current)
      const dup = this.db
        .select()
        .from(categories)
        .where(eq(categories.name, input.name.trim()))
        .get()
      if (dup && dup.id !== id) {
        throw new AppException('VALIDATION_ERROR', 'Category name already exists')
      }
    }

    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) updates.name = input.name.trim()
    if (input.color !== undefined) updates.color = input.color
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder

    if (Object.keys(updates).length > 0) {
      this.db.update(categories).set(updates).where(eq(categories.id, id)).run()
    }

    return this.getById(id)!
  }

  /**
   * Delete a category.
   * Tasks in this category will have their categoryId set to NULL (handled by ON DELETE SET NULL).
   */
  delete(id: string): void {
    this.db.delete(categories).where(eq(categories.id, id)).run()
  }

  count(): number {
    const result = this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(categories)
      .get()
    return result?.count ?? 0
  }
}
