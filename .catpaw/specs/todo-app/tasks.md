# Implementation Plan: Watermelon Todo App

## Overview

将设计文档转化为可执行的增量开发任务。采用自底向上的策略：先搭建数据层和共享类型，再实现主进程服务，接着构建 IPC 通信层，最后组装 UI 界面。每个阶段结束时都有检查点确保代码正确集成。

## Tasks

- [x] 1. 项目基础设施和依赖安装
  - 安装核心依赖: `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `date-fns`, `uuid`, `recharts`
  - 安装 shadcn/ui 及其依赖: 初始化 shadcn/ui，安装所需组件（Button, Input, Checkbox, Select, Calendar, Popover, Dialog, AlertDialog, Command, ScrollArea, Collapsible, DropdownMenu, Badge, Tooltip, Card, Textarea, Toast/Sonner, Sidebar）
  - 安装开发依赖: `vitest`, `fast-check`, `@types/better-sqlite3`, `@types/uuid`
  - 创建共享类型目录 `src/shared/`，定义 IPC channels 常量和所有 TypeScript 类型（Task, SubTask, Category, Tag, RecurrenceRule, TaskFilter, AppError 等）
  - 配置 vitest（vitest.config.ts）
  - 更新 tsconfig 配置以包含 shared 目录
  - _Requirements: 11.1, 12.5_

- [-] 2. 数据库 Schema 和迁移
  - [-] 2.1 使用 drizzle-orm 定义 SQLite schema
    - 创建 `src/main/db/schema.ts`，定义 tasks, sub_tasks, categories, tags, task_tags 表
    - 配置 drizzle-kit 用于迁移管理
    - 创建数据库初始化模块 `src/main/db/index.ts`，实现数据库连接、schema 初始化和迁移
    - 使用 `app.getPath('userData')` 存放数据库文件
    - _Requirements: 11.1, 11.2, 11.5_

  - [ ] 2.2 编写数据库 round-trip 属性测试
    - **Property 19: Task serialization round-trip**
    - **Validates: Requirements 11.4**

  - [ ] 2.3 编写事务原子性属性测试
    - **Property 20: Transaction atomicity**
    - **Validates: Requirements 11.5**

- [ ] 3. Task 核心服务实现
  - [ ] 3.1 实现 TaskService CRUD 操作
    - 创建 `src/main/services/task.service.ts`
    - 实现 create, getById, getAll, update, delete 方法
    - 包含标题验证（拒绝空/纯空白标题）
    - delete 操作使用事务级联删除子任务
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 3.2 编写 Task CRUD 属性测试
    - **Property 1: Valid task creation grows the task list**
    - **Property 2: Whitespace-only input rejection**
    - **Property 3: Task edit persistence (round-trip)**
    - **Property 4: Task deletion cascades to sub-tasks**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 2.4, 2.5**

  - [ ] 3.3 实现 Task 完成逻辑
    - 在 TaskService 中实现 complete 方法
    - 设置 status='completed' 和 completedAt 时间戳
    - 如果任务有 recurrenceRule，创建下一个实例
    - _Requirements: 1.6, 7.2_

  - [ ] 3.4 编写完成和重复任务属性测试
    - **Property 5: Completion sets status and timestamp**
    - **Property 14: Recurring task next-occurrence generation**
    - **Validates: Requirements 1.6, 7.2**

  - [ ] 3.5 实现 SubTask CRUD 操作
    - 在 TaskService 中实现 createSubTask, updateSubTask, deleteSubTask
    - 包含子任务标题验证
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 3.6 编写子任务属性测试
    - **Property 6: Sub-task completion toggle is idempotent**
    - **Validates: Requirements 2.2**

- [ ] 4. Checkpoint - 核心 Task 服务测试通过
  - 确保所有测试通过，如有问题请咨询用户。

- [ ] 5. Category 和 Tag 服务实现
  - [ ] 5.1 实现 CategoryService
    - 创建 `src/main/services/category.service.ts`
    - 实现 create, getAll, update, delete 方法
    - delete 时将关联任务的 categoryId 设为 null
    - 验证名称唯一性
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 5.2 编写 Category 属性测试
    - **Property 7: Category filter returns exact matches**
    - **Property 8: Category deletion nullifies task references**
    - **Property 9: Duplicate category name rejection**
    - **Validates: Requirements 3.3, 3.4, 3.5**

  - [ ] 5.3 实现 TagService
    - 创建 `src/main/services/tag.service.ts`
    - 实现 create, getAll, delete, addToTask, removeFromTask 方法
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 5.4 编写 Tag 属性测试
    - **Property 10: Tag multi-filter returns intersection**
    - **Validates: Requirements 4.3, 8.2**

- [ ] 6. Recurrence（重复规则）和日期工具
  - [ ] 6.1 实现重复规则计算模块
    - 创建 `src/main/utils/recurrence.ts`
    - 实现 getNextOccurrence 函数，支持 daily/weekly/monthly/custom
    - 处理无效日期调整（如 Feb 30 → Feb 28/29）
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

  - [ ] 6.2 编写重复规则属性测试
    - **Property 15: Invalid recurrence date adjustment**
    - **Validates: Requirements 7.5**

- [ ] 7. Search 和 Filter 服务
  - [ ] 7.1 实现 SearchService
    - 创建 `src/main/services/search.service.ts`
    - 设置 FTS5 虚拟表用于全文搜索
    - 实现多条件组合过滤（category, tags, priority, status, dateRange）
    - 支持按 dueDate、priority、createdAt 排序
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 7.2 编写搜索属性测试
    - **Property 16: Search case-insensitivity**
    - **Validates: Requirements 8.1, 8.4**

- [ ] 8. 日期过滤和优先级工具函数
  - [ ] 8.1 实现渲染层工具函数
    - 创建 `src/renderer/src/utils/date-filters.ts`：isOverdue, isToday, isUpcoming 函数
    - 创建 `src/renderer/src/utils/priority.ts`：priorityToRank, sortByPriority 函数
    - _Requirements: 5.3, 6.2, 6.4, 6.5_

  - [ ] 8.2 编写日期过滤和优先级属性测试
    - **Property 11: Priority sort ordering**
    - **Property 12: Overdue detection accuracy**
    - **Property 13: Today and Upcoming filter correctness**
    - **Validates: Requirements 5.3, 6.2, 6.4, 6.5**

- [ ] 9. Checkpoint - 所有主进程服务和工具函数测试通过
  - 确保所有测试通过，如有问题请咨询用户。

- [ ] 10. IPC 通信层
  - [ ] 10.1 实现 IPC handler 注册
    - 创建 `src/main/ipc/handlers.ts`，为所有 IPC_CHANNELS 注册 ipcMain.handle
    - 将每个 IPC 调用路由到对应的 Service 方法
    - 统一错误包装为 AppError 格式
    - 在 `src/main/index.ts` 中集成：初始化数据库、注册 IPC handlers
    - _Requirements: 11.3_

  - [ ] 10.2 更新 Preload 脚本
    - 更新 `src/preload/index.ts`，通过 contextBridge 暴露类型安全的 API
    - 更新 `src/preload/index.d.ts`，声明 window.api 类型
    - _Requirements: 11.3_

- [ ] 11. Notification 服务
  - [ ] 11.1 实现 NotificationService
    - 创建 `src/main/services/notification.service.ts`
    - 使用 Electron Notification API 发送 macOS 原生通知
    - 实现 schedule/cancel/reschedule，使用 setTimeout 或 node-schedule 调度
    - 实现 checkMissedReminders，应用启动时检查过期提醒
    - 在 IPC handlers 中集成通知调度
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 11.2 编写通知服务属性测试
    - **Property 17: Notification schedule/cancel lifecycle**
    - **Validates: Requirements 9.1, 9.3, 9.4**

- [ ] 12. Statistics 服务
  - [ ] 12.1 实现 StatisticsService
    - 创建 `src/main/services/statistics.service.ts`
    - 使用 SQL 聚合查询实现 getStats（day/week/month 完成数、完成率）
    - 实现 getDailyTrend（过去 N 天每日完成和创建数）
    - 在 IPC handlers 中注册
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 12.2 编写统计服务属性测试
    - **Property 18: Statistics accuracy**
    - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 13. Checkpoint - 主进程全部服务完成，IPC 层就绪
  - 确保所有测试通过，如有问题请咨询用户。

- [x] 14. UI - Sidebar 和导航
  - [x] 14.1 实现应用布局和 Sidebar
    - 创建三栏布局组件 `src/renderer/src/components/Layout.tsx`
    - 使用 shadcn/ui Sidebar 组件实现左侧导航
    - 实现 SmartFilters（Inbox / Today / Upcoming / All / Completed）
    - 实现 CategoryList：显示分类列表，支持选中过滤
    - 实现 TagList：显示标签列表
    - 实现添加/编辑/删除分类的 Dialog
    - _Requirements: 3.3, 12.1_

- [x] 15. UI - 任务列表面板
  - [x] 15.1 实现 TaskList 组件
    - 创建 `src/renderer/src/components/TaskList.tsx`
    - 使用 shadcn/ui Checkbox 显示任务项，支持一键完成
    - 显示优先级标识（颜色/图标）、截止日期、过期标记
    - 使用 shadcn/ui ScrollArea 实现虚拟滚动区域
    - _Requirements: 1.3, 1.6, 5.2, 6.2_

  - [x] 15.2 实现搜索和排序
    - 使用 shadcn/ui Command 组件实现搜索框
    - 使用 shadcn/ui DropdownMenu 实现排序选项（按日期、优先级、创建时间）
    - 实现空状态展示
    - _Requirements: 8.1, 8.3, 5.3, 6.3_

  - [x] 15.3 实现快速添加任务
    - 在列表底部创建 AddTaskBar 组件
    - 使用 shadcn/ui Input，支持 Enter 快速创建
    - _Requirements: 1.1, 1.2_

- [x] 16. UI - 任务详情面板
  - [x] 16.1 实现 TaskDetail 组件
    - 创建 `src/renderer/src/components/TaskDetail.tsx`
    - 标题可编辑（Input）、描述可编辑（Textarea）
    - 优先级选择（shadcn/ui Select）
    - 分类选择（shadcn/ui Select）
    - 标签管理（shadcn/ui Badge + Command 多选）
    - 截止日期选择（shadcn/ui Popover + Calendar）
    - 删除确认（shadcn/ui AlertDialog）
    - _Requirements: 1.3, 1.4, 3.2, 4.1, 4.2, 5.1, 6.1_

  - [x] 16.2 实现子任务列表
    - 在详情面板中创建 SubTaskList 组件
    - 支持添加、完成切换、删除子任务
    - 所有子任务完成时显示提示
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 16.3 实现重复规则设置
    - 创建 RecurrenceSettings 组件
    - 使用 shadcn/ui Select 选择重复类型（daily/weekly/monthly/custom）
    - 支持自定义间隔和每周指定天数
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 16.4 实现提醒设置
    - 创建 ReminderSettings 组件
    - 使用 shadcn/ui Popover + Calendar + 时间选择实现提醒时间设定
    - _Requirements: 9.1, 9.3, 9.4_

- [x] 17. Checkpoint - 核心 UI 集成完成
  - 确保应用可以运行，完整的 CRUD 流程正常工作。如有问题请咨询用户。

- [x] 18. UI - 统计视图
  - [x] 18.1 实现统计页面
    - 创建 `src/renderer/src/components/Statistics.tsx`
    - 使用 shadcn/ui Card 展示汇总数据（今日/本周/本月完成数、完成率）
    - 使用 recharts AreaChart 显示 30 天完成趋势图
    - 在 Sidebar 中添加入口导航
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 19. 状态管理和全局集成
  - [x] 19.1 实现 React Context 状态管理
    - 创建 `src/renderer/src/context/AppContext.tsx`
    - 使用 useReducer 管理全局状态：tasks, categories, tags, selectedFilter, selectedTaskId
    - 封装 IPC 调用为 React hooks: useTaskActions, useCategoryActions, useTagActions
    - 实现初始数据加载（应用启动时从主进程获取数据）
    - _Requirements: 1.1-1.6, 3.2, 3.3, 4.1, 4.2_

- [x] 20. 键盘快捷键
  - [x] 20.1 实现全局键盘快捷键
    - Cmd+N: 新建任务（聚焦 AddTaskBar）
    - Cmd+D / Delete: 删除选中任务
    - Enter: 标记选中任务完成
    - Up/Down: 在任务列表中导航
    - Cmd+F: 聚焦搜索框
    - _Requirements: 12.3_

- [x] 21. 错误处理和 Toast 通知
  - [x] 21.1 集成错误处理
    - 安装并配置 sonner（shadcn/ui 推荐的 toast 库）
    - 在所有 IPC 调用处添加错误捕获，显示 Toast 错误提示
    - 添加 React ErrorBoundary 兜底
    - _Requirements: 11.3_

- [x] 22. UI 打磨和 Things 3 美学
  - [x] 22.1 视觉风格优化
    - 调整 shadcn/ui 主题变量，匹配 Things 3 柔和色调
    - 优化间距、字体大小、过渡动画
    - 确保三栏布局响应式适配
    - 处理面板最小宽度约束
    - _Requirements: 12.4, 12.5_

- [x] 23. Final Checkpoint - 全部功能集成测试
  - 确保所有测试通过，应用可正常运行。如有问题请咨询用户。

## Notes

- All tasks are required (no optional tasks)
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- shadcn/ui 组件在安装后可直接在项目中使用，其源码会被复制到 `src/renderer/src/components/ui/` 目录

