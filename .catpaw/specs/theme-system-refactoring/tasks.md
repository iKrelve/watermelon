# Implementation Plan: Theme System Refactoring

## Overview

按增量方式实施主题重构：先建立基础设施（CSS 变量 + preset 定义），再逐步迁移组件中的硬编码颜色，最后构建 UI 并编写测试。每个步骤都在前一步骤基础上构建，确保无孤立代码。

## Tasks

- [ ] 1. 创建主题 preset 基础设施
  - [ ] 1.1 创建 `src/mainview/theme/presets.ts`
    - 定义 `ThemePreset` interface 和 `REQUIRED_TOKENS` 常量
    - 导出 4 个 preset 对象：`apple-light`、`apple-dark`、`pastel`、`midnight`
    - 每个 preset 包含 `id`、`nameKey`、`colorMode`、`cssClass`、`preview` 字段
    - _Requirements: 1.1, 2.2, 2.3_

  - [ ] 1.2 创建 `src/mainview/theme/apply.ts`
    - 实现 `applyPresetClass(presetId: string)` 函数：移除旧 `theme-*` class，添加新 class
    - 实现 `getPresetById(id: string)` 查找函数
    - 实现 `resolveColorMode(preset: ThemePreset)` 返回 `'light' | 'dark'`
    - _Requirements: 1.2, 1.5_

  - [ ]* 1.3 编写 preset 基础设施的属性测试
    - **Property 2: All presets define all required tokens**
    - **Validates: Requirements 1.1, 2.1, 2.4, 4.2, 4.3, 4.4**

- [ ] 2. 重构 CSS 变量体系（`index.css`）
  - [ ] 2.1 扩展 `@theme inline` 块
    - 新增 `--color-priority-high/medium/low` 映射
    - 新增 `--color-status-success/warning/error` 映射
    - 新增 `--duration-fast/normal/slow` 自定义属性
    - _Requirements: 4.2, 4.3, 4.4, 6.2_

  - [ ] 2.2 重写 `:root` 和 `.dark` 色值为 Apple 风格
    - `:root` / `.theme-apple`：Apple Light 色板（系统蓝为 primary、cool-neutral 基础）
    - `.dark.theme-apple` / `.dark:not([class*="theme-"])`：Apple Dark 色板（elevated surfaces）
    - 加入 sidebar vibrancy 半透明值和 `backdrop-filter`
    - 定义 `priority-high/medium/low` 和 `status-success/warning/error` 变量
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_

  - [ ] 2.3 添加 Pastel 和 Midnight preset CSS
    - `.theme-pastel`：柔和暖色调（soft rose primary + cream 背景）
    - `.dark.theme-pastel`：柔和暗色版本
    - `.theme-midnight`：深邃午夜（deep navy + electric indigo primary）
    - 每个 preset 定义完整的 token 集合
    - _Requirements: 1.1_

  - [ ] 2.4 添加毛玻璃和动画工具类
    - 添加 `.vibrancy-sidebar` / `.vibrancy-overlay` 类（`backdrop-filter: blur()` + 半透明背景）
    - 添加 `@media (prefers-reduced-transparency: reduce)` 回退规则
    - 更新 `@media (prefers-reduced-motion: reduce)` 使用 `--duration-*` 变量
    - 添加 `::selection` 使用 `var(--primary)` 替代硬编码 oklch
    - 添加 `:focus-visible` 使用 `var(--ring)` 替代硬编码 oklch
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.3_

  - [ ]* 2.5 编写 WCAG 对比度属性测试
    - **Property 3: Text/background contrast meets WCAG AA**
    - **Validates: Requirements 2.5**

- [ ] 3. Checkpoint — 确保 CSS 变量正确加载
  - 确保所有测试通过，如有问题询问用户

- [ ] 4. 集成 preset 系统到状态管理
  - [ ] 4.1 扩展 UIStore
    - 在 `UIState` 中新增 `themePreset: string`（默认 `'apple-light'`）
    - 在 `UIActions` 中新增 `setThemePreset: (presetId: string) => void`
    - `setThemePreset` 调用 `applyPresetClass()` + `next-themes.setTheme()`
    - 在 `partialize` 中加入 `themePreset` 以持久化
    - 在 `onRehydrateStorage` 中恢复 preset class
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ] 4.2 增强 ThemeProvider
    - 在 `ThemeProvider` mount 时从 UIStore 读取 preset 并应用 CSS class
    - 监听系统 `prefers-color-scheme` 变化，当 preset 为 "system" 时自动切换
    - _Requirements: 1.4, 1.5_

  - [ ]* 4.3 编写持久化 round-trip 属性测试
    - **Property 1: Theme preset persistence round-trip**
    - **Validates: Requirements 1.3, 1.4**

- [ ] 5. 迁移硬编码颜色到 CSS 变量
  - [ ] 5.1 重构 `utils/priority.ts`
    - `getPriorityColor()` 返回 `text-priority-high` / `text-priority-medium` / `text-priority-low`
    - `getPriorityBadgeClasses()` 使用 `bg-priority-high/10` 等 Tailwind 语法
    - `getPriorityStripeColor()` 返回 `bg-priority-high` 等
    - _Requirements: 4.1, 4.2_

  - [ ] 5.2 迁移 `TaskItemContent.tsx` 中的硬编码颜色
    - checkbox 优先级颜色：`border-red-400` → `border-priority-high` 等
    - 优先级指示器小点：`bg-red-500` → `bg-priority-high`
    - _Requirements: 4.1, 7.2_

  - [ ] 5.3 迁移 `SubTaskRow.tsx` 和 `task-detail/SubTaskItem.tsx` 中的硬编码颜色
    - 同 5.2 的 checkbox 优先级颜色迁移
    - _Requirements: 4.1_

  - [ ] 5.4 迁移 `TaskDetail.tsx` 中的硬编码颜色
    - 优先级选择器小点：`bg-red-500` → `bg-priority-high` 等
    - _Requirements: 4.1_

  - [ ] 5.5 迁移 `TaskContextMenu.tsx` 中的硬编码颜色
    - `text-red-500` → `text-priority-high` 等
    - _Requirements: 4.1_

  - [ ] 5.6 迁移 `Statistics.tsx` 中的硬编码颜色
    - 图标颜色：`text-emerald-500` → `text-status-success`，`text-blue-500` → `text-primary`，`text-orange-500` → `text-status-warning`
    - 图表渐变 `#22c55e` / `#3b82f6` → 使用 `var(--color-status-success)` / `var(--color-primary)`
    - 进度条 `bg-blue-500` → `bg-primary`
    - 图例小点 `bg-emerald-500` / `bg-blue-500` → `bg-status-success` / `bg-primary`
    - _Requirements: 4.1, 7.1_

  - [ ] 5.7 迁移 `CalendarView.tsx` 中的硬编码颜色
    - 优先级颜色 `bg-red-400` / `bg-amber-400` / `bg-blue-400` → `bg-priority-high` 等
    - 完成状态 `text-green-600` → `text-status-success`
    - _Requirements: 4.1, 7.2_

  - [ ] 5.8 迁移 `CategoryDialog.tsx` 中的颜色调色板
    - 保留用户自定义颜色的 hex 值（这些是数据，非主题颜色）
    - 仅迁移默认 fallback `#94a3b8` → `var(--color-muted-foreground)` 或保持（用户数据颜色例外）
    - _Requirements: 4.1_

  - [ ] 5.9 迁移 `index.css` 中 TipTap 样式的硬编码 oklch 值
    - placeholder 颜色、blockquote border/color、code background、hr border → 使用 CSS 变量
    - _Requirements: 4.1, 7.3_

  - [ ] 5.10 迁移 `task-detail/SubTaskList.tsx` 中的硬编码颜色
    - `text-emerald-600` → `text-status-success`
    - _Requirements: 4.1_

- [ ] 6. Checkpoint — 确保所有颜色迁移无视觉回归
  - 确保所有测试通过，如有问题询问用户

- [ ] 7. 构建主题选择器 UI
  - [ ] 7.1 创建 `ThemeSelector.tsx` 组件
    - 使用 Popover 展示 4 个 preset 色块预览
    - 每个色块显示 primary + background + accent 的 3 色条
    - 当前选中项显示勾选标记
    - 包含 "跟随系统" 选项
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 7.2 替换 `AppSidebar.tsx` 中的主题下拉菜单
    - 移除现有亮/暗/系统的 DropdownMenu
    - 替换为 ThemeSelector 组件
    - 添加侧边栏的 vibrancy 效果 class
    - _Requirements: 5.1, 3.1_

  - [ ] 7.3 更新 `Layout.tsx` 中弹窗/覆层的毛玻璃效果
    - 在必要位置添加 vibrancy 相关 class
    - _Requirements: 3.2_

- [ ] 8. 添加动画优化
  - [ ] 8.1 更新动画系统
    - 主题切换时在 `<html>` 上临时添加 `transition: background-color 200ms ease-out, color 200ms ease-out`
    - 更新 `taskComplete` / `listEnter` / `fadeIn` 动画使用 `var(--duration-*)` 变量
    - hover 状态添加 `transition-colors duration-150`
    - _Requirements: 6.1, 6.4, 6.5_

- [ ] 9. 国际化文本更新
  - [ ] 9.1 更新 `zh-CN.ts` 和 `en.ts`
    - 添加 preset 名称翻译 key：`theme.appleLight`、`theme.appleDark`、`theme.pastel`、`theme.midnight`、`theme.system`
    - _Requirements: 5.3_

- [ ] 10. Final Checkpoint — 确保所有测试通过
  - 确保所有测试通过，如有问题询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- SVG logo 中的硬编码颜色（西瓜图标）为品牌元素，保持不变
- `CategoryDialog.tsx` 中的颜色调色板是用户数据选择器，不属于主题颜色
- Tag/Category 的 `color` 字段来自数据库，是用户自定义数据颜色，其 fallback `#94a3b8` 可考虑迁移为 CSS 变量

