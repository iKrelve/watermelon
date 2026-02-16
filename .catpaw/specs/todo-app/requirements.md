# Requirements Document

## Introduction

Watermelon 是一款面向 macOS 的极简 Todo 管理桌面应用，基于 Electron + React + TypeScript + TailwindCSS + shadcn/ui + SQLite 构建。应用采用 Things 3 风格的干净清爽 UI，使用 shadcn/ui 作为基础组件库提供一致且高质量的交互体验。功能涵盖增删改查、分类/标签管理、优先级、截止日期、子任务、重复任务、macOS 原生通知提醒以及数据统计。数据存储采用本地优先策略（SQLite），架构上为未来云同步预留扩展空间。

## Glossary

- **Task**: 一条待办事项，包含标题、描述、状态、优先级、截止日期等属性
- **Sub-Task**: 隶属于某个 Task 的子任务，有独立的完成状态
- **Category**: 任务分类，用于对 Task 进行分组管理（如"工作"、"生活"）
- **Tag**: 标签，一个 Task 可以有多个 Tag，用于灵活标记和过滤
- **Priority**: 任务优先级，分为 None / Low / Medium / High
- **Recurrence_Rule**: 重复规则，定义 Task 的重复模式（如每日、每周、每月、自定义）
- **Reminder**: 任务提醒，在指定时间通过 macOS 原生通知中心推送通知
- **Task_Store**: 基于 SQLite 的本地数据持久化层
- **Notification_Service**: 负责调度和推送 macOS 系统通知的服务
- **Statistics_Engine**: 负责聚合和计算任务完成数据统计的模块
- **Search_Engine**: 负责在任务数据中进行全文搜索和过滤的模块
- **Renderer**: Electron 渲染进程，运行 React UI
- **Main_Process**: Electron 主进程，负责数据库操作、系统通知等原生功能
- **shadcn/ui**: 基于 Radix UI 和 TailwindCSS 的可定制 React 组件库，提供 Button、Dialog、Input、Popover、Calendar、Command 等标准化 UI 组件

## Requirements

### Requirement 1: Task CRUD Operations

**User Story:** As a user, I want to create, read, update, and delete tasks, so that I can manage my daily to-do items.

#### Acceptance Criteria

1. WHEN a user submits a new task with a non-empty title, THE Task_Store SHALL create a new Task record and THE Renderer SHALL display the task in the task list
2. WHEN a user attempts to create a task with an empty or whitespace-only title, THE Task_Store SHALL reject the creation and THE Renderer SHALL display a validation message
3. WHEN a user selects a task, THE Renderer SHALL display the task's full details including title, description, priority, category, tags, due date, and sub-tasks
4. WHEN a user edits a task's properties and confirms the change, THE Task_Store SHALL persist the updated values immediately
5. WHEN a user deletes a task, THE Task_Store SHALL remove the task and all its associated sub-tasks from the database
6. WHEN a user marks a task as complete, THE Task_Store SHALL update the task status to "completed" and record the completion timestamp

### Requirement 2: Sub-Task Management

**User Story:** As a user, I want to break down tasks into sub-tasks, so that I can track granular progress on complex work.

#### Acceptance Criteria

1. WHEN a user adds a sub-task to an existing task, THE Task_Store SHALL create a Sub-Task record linked to the parent Task
2. WHEN a user toggles a sub-task's completion status, THE Task_Store SHALL update the sub-task status and THE Renderer SHALL reflect the change visually
3. WHEN all sub-tasks of a task are marked complete, THE Renderer SHALL display a visual indicator suggesting the parent task is ready to complete
4. WHEN a parent task is deleted, THE Task_Store SHALL delete all associated sub-tasks
5. WHEN a user attempts to add a sub-task with an empty title, THE Task_Store SHALL reject the addition

### Requirement 3: Category Management

**User Story:** As a user, I want to organize my tasks into categories, so that I can group related tasks together.

#### Acceptance Criteria

1. WHEN a user creates a new category with a unique non-empty name, THE Task_Store SHALL persist the Category record
2. WHEN a user assigns a task to a category, THE Task_Store SHALL update the task's category reference
3. WHEN a user selects a category in the sidebar, THE Renderer SHALL display only tasks belonging to that category
4. WHEN a user deletes a category, THE Task_Store SHALL set the category reference of all tasks in that category to null (uncategorized)
5. WHEN a user attempts to create a category with a duplicate name, THE Task_Store SHALL reject the creation

### Requirement 4: Tag Management

**User Story:** As a user, I want to tag my tasks with multiple labels, so that I can flexibly categorize and filter tasks across different dimensions.

#### Acceptance Criteria

1. WHEN a user adds a tag to a task, THE Task_Store SHALL create the tag-task association
2. WHEN a user removes a tag from a task, THE Task_Store SHALL delete the tag-task association
3. WHEN a user filters tasks by one or more tags, THE Search_Engine SHALL return only tasks that contain all selected tags
4. THE Task_Store SHALL allow each Task to have zero or more Tags associated with it

### Requirement 5: Priority Management

**User Story:** As a user, I want to set priority levels on tasks, so that I can focus on the most important items first.

#### Acceptance Criteria

1. WHEN a user sets a task's priority, THE Task_Store SHALL persist the priority value (None, Low, Medium, or High)
2. WHEN tasks are displayed in a list, THE Renderer SHALL visually distinguish priority levels using distinct colors or icons
3. WHEN a user sorts by priority, THE Renderer SHALL order tasks from High to None priority

### Requirement 6: Due Date and Scheduling

**User Story:** As a user, I want to set due dates on tasks, so that I can plan my work with deadlines.

#### Acceptance Criteria

1. WHEN a user sets a due date on a task, THE Task_Store SHALL persist the due date value
2. WHEN a task's due date has passed and the task is incomplete, THE Renderer SHALL visually mark the task as overdue
3. WHEN a user views the task list, THE Renderer SHALL support sorting tasks by due date
4. WHILE viewing the "Today" filter, THE Renderer SHALL display only tasks with a due date of the current day
5. WHILE viewing the "Upcoming" filter, THE Renderer SHALL display incomplete tasks with due dates within the next 7 days, ordered by due date

### Requirement 7: Recurring Tasks

**User Story:** As a user, I want to set tasks to recur on a schedule, so that I don't have to manually recreate routine tasks.

#### Acceptance Criteria

1. WHEN a user sets a recurrence rule (daily, weekly, monthly, or custom interval) on a task, THE Task_Store SHALL persist the Recurrence_Rule
2. WHEN a recurring task is marked as complete, THE Task_Store SHALL create a new Task instance with the next occurrence date based on the Recurrence_Rule
3. WHEN a user modifies the recurrence rule of a task, THE Task_Store SHALL apply the new rule starting from the next occurrence
4. WHEN a user removes the recurrence rule from a task, THE Task_Store SHALL stop generating new occurrences after the current one is completed
5. IF a Recurrence_Rule produces an invalid date (e.g., February 30), THEN THE Task_Store SHALL adjust to the nearest valid date

### Requirement 8: Search and Filter

**User Story:** As a user, I want to search and filter tasks, so that I can quickly find specific tasks.

#### Acceptance Criteria

1. WHEN a user types a search query, THE Search_Engine SHALL return tasks whose title or description contains the query text within 200ms
2. WHEN a user applies multiple filters (category, tag, priority, status) simultaneously, THE Search_Engine SHALL return the intersection of all filter criteria
3. WHEN a search query matches zero tasks, THE Renderer SHALL display an empty state message
4. THE Search_Engine SHALL perform case-insensitive matching for all text searches

### Requirement 9: macOS Native Notifications

**User Story:** As a user, I want to receive reminder notifications, so that I don't miss deadlines or scheduled tasks.

#### Acceptance Criteria

1. WHEN a user sets a reminder time on a task, THE Notification_Service SHALL schedule a macOS system notification for that time
2. WHEN the scheduled reminder time arrives, THE Notification_Service SHALL deliver a notification through macOS Notification Center displaying the task title
3. WHEN a user removes a reminder from a task, THE Notification_Service SHALL cancel the scheduled notification
4. WHEN a user updates a reminder time, THE Notification_Service SHALL cancel the old notification and schedule a new one
5. IF the application is not running when a reminder time arrives, THEN THE Notification_Service SHALL deliver the missed notification upon next application launch

### Requirement 10: Data Statistics

**User Story:** As a user, I want to view statistics about my task completion, so that I can track my productivity over time.

#### Acceptance Criteria

1. WHEN a user opens the statistics view, THE Statistics_Engine SHALL display the total number of tasks completed in the current day, week, and month
2. WHEN a user opens the statistics view, THE Statistics_Engine SHALL display a completion rate (completed / total tasks) for the selected time period
3. WHEN a user opens the statistics view, THE Statistics_Engine SHALL display a daily completion trend chart for the past 30 days
4. THE Statistics_Engine SHALL calculate statistics based on task completion timestamps stored in Task_Store

### Requirement 11: Data Persistence and Integrity

**User Story:** As a developer, I want reliable local data storage, so that user data is never lost and future cloud sync is feasible.

#### Acceptance Criteria

1. THE Task_Store SHALL persist all data to a local SQLite database file in the application's user data directory
2. WHEN the application starts, THE Task_Store SHALL initialize the database schema and apply any pending migrations
3. WHEN any write operation fails, THE Task_Store SHALL return an error and THE Renderer SHALL display an error notification
4. THE Task_Store SHALL serialize Task objects to database records and deserialize database records back to Task objects faithfully (round-trip consistency)
5. THE Task_Store SHALL use database transactions for operations that modify multiple records to ensure atomicity

### Requirement 12: User Interface Layout

**User Story:** As a user, I want a clean, Things 3-like interface, so that managing tasks feels calm and focused.

#### Acceptance Criteria

1. THE Renderer SHALL display a three-panel layout: a sidebar for navigation (categories, filters), a task list panel, and a detail panel
2. WHEN a user clicks a task in the task list, THE Renderer SHALL display the task details in the detail panel
3. THE Renderer SHALL support keyboard shortcuts for common actions: creating a task, marking complete, deleting, and navigating between tasks
4. WHILE the application window is resized, THE Renderer SHALL maintain a responsive layout with appropriate minimum widths for each panel
5. THE Renderer SHALL use shadcn/ui components as the foundational UI building blocks with a consistent color scheme, muted tones, ample whitespace, and clean typography following the Things 3 aesthetic

