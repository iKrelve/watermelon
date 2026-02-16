import { Notification } from 'electron'
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, and, isNotNull, lte } from 'drizzle-orm'
import * as schema from '../db/schema'
import { tasks } from '../db/schema'

interface ScheduledReminder {
  taskId: string
  title: string
  timer: ReturnType<typeof setTimeout>
}

export class NotificationService {
  private scheduledReminders: Map<string, ScheduledReminder> = new Map()

  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  /**
   * Schedule a macOS notification at the specified time.
   */
  schedule(taskId: string, title: string, reminderTime: Date): void {
    // Cancel any existing reminder for this task
    this.cancel(taskId)

    const now = Date.now()
    const delay = reminderTime.getTime() - now

    if (delay <= 0) {
      // Reminder time is in the past, deliver immediately
      this.deliverNotification(taskId, title)
      return
    }

    const timer = setTimeout(() => {
      this.deliverNotification(taskId, title)
      this.scheduledReminders.delete(taskId)
    }, delay)

    this.scheduledReminders.set(taskId, { taskId, title, timer })
  }

  /**
   * Cancel a scheduled notification.
   */
  cancel(taskId: string): void {
    const reminder = this.scheduledReminders.get(taskId)
    if (reminder) {
      clearTimeout(reminder.timer)
      this.scheduledReminders.delete(taskId)
    }
  }

  /**
   * Reschedule a notification with a new time.
   */
  reschedule(taskId: string, title: string, newTime: Date): void {
    this.cancel(taskId)
    this.schedule(taskId, title, newTime)
  }

  /**
   * Check for missed reminders on application startup.
   * Delivers notifications for any tasks with reminder times in the past.
   */
  checkMissedReminders(): void {
    const now = new Date().toISOString()

    const missedTasks = this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'todo'),
          isNotNull(tasks.reminderTime),
          lte(tasks.reminderTime, now)
        )
      )
      .all()

    for (const task of missedTasks) {
      this.deliverNotification(task.id, task.title)

      // Clear the reminder time after delivering
      this.db
        .update(tasks)
        .set({ reminderTime: null })
        .where(eq(tasks.id, task.id))
        .run()
    }
  }

  /**
   * Reschedule all future reminders (call on app startup).
   */
  scheduleAllFutureReminders(): void {
    const now = new Date().toISOString()

    const futureTasks = this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'todo'),
          isNotNull(tasks.reminderTime)
        )
      )
      .all()

    for (const task of futureTasks) {
      if (task.reminderTime && task.reminderTime > now) {
        this.schedule(task.id, task.title, new Date(task.reminderTime))
      }
    }
  }

  /**
   * Get the number of currently scheduled reminders (for testing).
   */
  getScheduledCount(): number {
    return this.scheduledReminders.size
  }

  /**
   * Check if a specific task has a scheduled reminder (for testing).
   */
  hasScheduled(taskId: string): boolean {
    return this.scheduledReminders.has(taskId)
  }

  /**
   * Clear all scheduled reminders (for cleanup).
   */
  clearAll(): void {
    for (const [, reminder] of this.scheduledReminders) {
      clearTimeout(reminder.timer)
    }
    this.scheduledReminders.clear()
  }

  private deliverNotification(taskId: string, title: string): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Watermelon 提醒',
        body: title,
        silent: false,
      })
      notification.show()
    }
  }
}
