# CODING_GUIDELINES.md — Agent 编码规范与开发流程

> 本文档是 AI Agent 执行开发任务时的操作手册。所有端到端流程、模式和约定均从实际代码中提取。

---

## 1. 端到端新功能开发流程

以"新增一个 CRUD 实体"为例，完整的修改链路如下。每个步骤标注了目标文件和关键代码模式。

### Step 1: 定义 Rust 数据模型

**文件**: `src-tauri/src/models/mod.rs`

所有 struct 必须满足:
- `#[derive(Debug, Clone, Serialize, Deserialize)]`
- `#[serde(rename_all = "camelCase")]` — 自动转换为前端 camelCase
- 可选字段用 `Option<T>`
- 关联数据用 `#[serde(skip_serializing_if = "Option::is_none")]`

```rust
// 核心数据类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyEntity {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<ChildEntity>>,
}

// 创建输入类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMyEntityInput {
    pub name: String,
    pub description: Option<String>,
}

// 更新输入类型 — Option<Option<T>> 区分"不更新"和"置为 null"
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMyEntityInput {
    pub name: Option<String>,
    pub description: Option<Option<String>>,  // None=不更新, Some(None)=置null, Some(Some(v))=设值
}
```

### Step 2: 定义 TypeScript 类型

**文件**: `src/shared/types.ts`

必须与 Rust struct 字段一一对应（camelCase）:

```typescript
export interface MyEntity {
  id: string
  name: string
  description: string | null
  createdAt: string
  children?: ChildEntity[]
}

export interface CreateMyEntityInput {
  name: string
  description?: string
}

export interface UpdateMyEntityInput {
  name?: string
  description?: string | null
}
```

### Step 3: 实现 Rust Service 层

**文件**: `src-tauri/src/services/my_entity.rs`（新建）

遵循现有 service 模式:

```rust
use rusqlite::{Connection, params, OptionalExtension};
use uuid::Uuid;
use crate::models::*;

// Row mapper
fn row_to_my_entity(row: &rusqlite::Row) -> rusqlite::Result<MyEntity> {
    Ok(MyEntity {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        created_at: row.get("created_at")?,
        children: None,
    })
}

// CRUD operations — 返回 Result<T, AppError>
pub fn create_my_entity(conn: &Connection, input: CreateMyEntityInput) -> Result<MyEntity, AppError> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    // ... SQL INSERT ...
    // 错误处理统一用 AppError
    conn.execute(/* ... */)
        .map_err(|e| AppError { code: "DB_ERROR".into(), message: e.to_string(), details: None })?;
    // 返回创建的实体
    Ok(/* ... */)
}
```

关键模式:
- ID 生成: `Uuid::new_v4().to_string()`
- 时间戳: `chrono::Utc::now().to_rfc3339()`
- 错误类型: 统一返回 `AppError`
- 验证: 在 service 层开头做（如 `validate_title()`）
- 动态 UPDATE: 遍历 Option 字段构建 SET 子句（参考 `task::update_task`）

### Step 4: 注册 Service Module

**文件**: `src-tauri/src/services/mod.rs`

```rust
pub mod my_entity;  // 新增一行
```

### Step 5: 定义 Tauri Command

**文件**: `src-tauri/src/commands/mod.rs`

所有 command 遵循统一签名模式:

```rust
#[tauri::command]
pub fn create_my_entity(db: State<Database>, data: CreateMyEntityInput) -> Result<MyEntity, String> {
    let conn = db.conn.lock().unwrap();
    my_entity::create_my_entity(&conn, data)
        .map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))
}
```

关键规则:
- 第一个参数通常是 `db: State<Database>`
- 需要通知功能时加 `notification_state: State<NotificationState>`
- 需要 app handle 时加 `app: tauri::AppHandle`
- 返回类型: `Result<T, String>`（String 是 JSON 序列化的 AppError）
- 错误转换: `.map_err(|e| serde_json::to_string(&e).unwrap_or(e.message))`

### Step 6: 注册 Command Handler

**文件**: `src-tauri/src/lib.rs`

在 `generate_handler![]` 宏中添加:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::create_my_entity,    // 新增
    commands::update_my_entity,    // 新增
    commands::delete_my_entity,    // 新增
    commands::get_my_entities,     // 新增
])
```

### Step 7: 添加前端 RPC 调用

**文件**: `src/mainview/rpc.ts`

在 `api` 对象中添加方法:

```typescript
export const api = {
  // ... existing methods ...

  // MyEntity operations
  createMyEntity: (data: CreateMyEntityInput) => invoke('create_my_entity', { data }),
  updateMyEntity: (id: string, data: UpdateMyEntityInput) => invoke('update_my_entity', { id, data }),
  deleteMyEntity: (id: string) => invoke('delete_my_entity', { id }),
  getMyEntities: () => invoke('get_my_entities'),
}
```

关键规则:
- 方法名用 camelCase
- `invoke()` 第一个参数是 Rust command 名（snake_case）
- 参数名必须与 Rust command 签名中的参数名一致（camelCase → snake_case 自动转换）
- import 类型: `import type { CreateMyEntityInput, ... } from '../shared/types'`

> 注意: `env.d.ts` 通过 `typeof api` 自动推导类型，无需手动修改。

### Step 8: 添加 React Query Hooks

**文件**: `src/mainview/hooks/useDataQueries.ts`

遵循现有模式添加 query key、query hook、mutation hook:

```typescript
// 1. 添加 query key
export const queryKeys = {
  // ... existing keys ...
  myEntities: ['myEntities'] as const,
}

// 2. Query hook (读取)
export function useMyEntitiesQuery(): UseQueryResult<MyEntity[]> {
  return useQuery({
    queryKey: queryKeys.myEntities,
    queryFn: async () => {
      const result = await window.api.getMyEntities()
      return unwrap(result) as MyEntity[]
    },
  })
}

// 3. Mutation hook (创建/更新/删除)
export function useCreateMyEntity(): UseMutationResult<MyEntity, Error, CreateMyEntityInput> {
  const queryClient = useQueryClient()
  return useMutation<MyEntity, Error, CreateMyEntityInput>({
    mutationFn: async (data: CreateMyEntityInput) => {
      const result = await window.api.createMyEntity(data)
      return unwrap(result) as MyEntity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEntities })
    },
  })
}
```

**Optimistic Update 模式**（用于需要即时 UI 反馈的操作，如 complete/uncomplete/reorder）:

```typescript
export function useToggleMyEntity(): UseMutationResult<MyEntity, Error, string> {
  const queryClient = useQueryClient()
  return useMutation<MyEntity, Error, string, { previous: MyEntity[] | undefined }>({
    mutationFn: async (id: string) => { /* invoke */ },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myEntities })
      const previous = queryClient.getQueryData<MyEntity[]>(queryKeys.myEntities)
      queryClient.setQueryData<MyEntity[]>(queryKeys.myEntities, (old) =>
        old?.map((item) => item.id === id ? { ...item, /* optimistic change */ } : item)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.myEntities, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myEntities })
    },
  })
}
```

### Step 9: 创建 UI 组件

**文件**: `src/mainview/components/MyEntity.tsx` 或 `src/mainview/components/my-entity/` 目录

组件拆分规则:
- 小组件: 单文件 `MyEntity.tsx`
- 大组件: 拆到子目录 `my-entity/`，通过 `index.ts` barrel export

### Step 10: 添加国际化文本

**文件**: `src/mainview/i18n/locales/zh-CN.ts` 和 `en.ts`

```typescript
// zh-CN.ts
myEntity: {
  title: '我的实体',
  create: '创建',
  delete: '删除',
  // ...
}
```

组件中使用:
```typescript
const { t } = useTranslation()
// ...
<span>{t('myEntity.title')}</span>
```

### Step 11: 添加测试

- **前端**: `src/mainview/utils/__tests__/my-entity.test.ts`
- **后端**: `src-tauri/src/services/my_entity.rs` 中的 `#[cfg(test)]` module

---

## 2. 前后端类型同步规范

### 类型对照表

| Rust (`models/mod.rs`) | TypeScript (`shared/types.ts`) | 说明 |
|------------------------|-------------------------------|------|
| `String` | `string` | |
| `i64` / `f64` | `number` | |
| `bool` | `boolean` | |
| `Option<String>` | `string \| null` | |
| `Option<T>` (in Create input) | `T?` (optional field) | 创建时可选 |
| `Option<Option<T>>` (in Update input) | `T?` + `null` union | 区分不更新/置空/设值 |
| `Vec<T>` | `T[]` | |
| `Option<Vec<T>>` + `skip_serializing_if` | `T[]?` (optional) | 关联数据 |
| `#[serde(rename = "type")]` | field name `type` | Rust 保留字需 rename |

### serde 关键注解

```rust
#[serde(rename_all = "camelCase")]     // struct 级: snake_case → camelCase
#[serde(skip_serializing_if = "Option::is_none")]  // 字段级: None 时不序列化
#[serde(rename = "type")]              // 字段级: Rust 保留字处理
```

### 同步检查清单

修改数据结构时，必须同时更新:
1. `src-tauri/src/models/mod.rs` — Rust struct
2. `src/shared/types.ts` — TypeScript interface
3. 相关的 service 层 SQL 查询和 row mapper
4. 相关的 rpc.ts 方法签名（如参数变更）

---

## 3. IPC 通信标准化流程

### 新增 Command 的完整步骤

```
models/mod.rs → services/<domain>.rs → services/mod.rs → commands/mod.rs → lib.rs → rpc.ts → useDataQueries.ts
```

### Command 签名模式

```rust
// 标准读取
#[tauri::command]
pub fn get_xxx(db: State<Database>) -> Result<Vec<Xxx>, String> { ... }

// 标准创建
#[tauri::command]
pub fn create_xxx(db: State<Database>, data: CreateXxxInput) -> Result<Xxx, String> { ... }

// 标准更新
#[tauri::command]
pub fn update_xxx(db: State<Database>, id: String, data: UpdateXxxInput) -> Result<Xxx, String> { ... }

// 标准删除
#[tauri::command]
pub fn delete_xxx(db: State<Database>, id: String) -> Result<(), String> { ... }

// 需要 notification + app handle
#[tauri::command]
pub fn complete_xxx(
    db: State<Database>,
    notification_state: State<NotificationState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<CompleteXxxResult, String> { ... }
```

### 参数命名规则

| Rust command 参数 | rpc.ts invoke 参数 | 说明 |
|------------------|-------------------|------|
| `data: CreateXxxInput` | `{ data }` | 输入对象 |
| `id: String` | `{ id }` | 单个 ID |
| `task_id: String` | `{ taskId }` | 复合 ID（Tauri 自动转换 camelCase → snake_case） |
| `filter: Option<TaskFilter>` | `{ filter }` | 可选过滤器 |

### 错误处理链路

```
Rust service → AppError → commands (map_err → JSON string) → invoke rejected promise → React Query onError
```

前端不需要手动 parse 错误 — React Query 的 `onError` 回调直接收到 Error 对象。

---

## 4. 状态管理规范

### 决策树

```
需要管理的状态是什么？
├── UI 交互状态（不涉及后端）→ Zustand (ui-store.ts)
│   例: filterView, selectedTaskId, compactMode, searchQuery, commandPaletteOpen, language
│
├── 服务端数据（需要从 Rust 读写）→ React Query (useDataQueries.ts)
│   例: tasks, categories, tags, stats, dailyTrend
│
└── 全局配置（跨组件共享）→ Zustand (带 persist middleware)
    例: compactMode, language (持久化到 localStorage)
```

### Zustand Store 扩展模式

```typescript
// 在 ui-store.ts 中添加新状态和 action

interface UIState {
  // ... existing ...
  myNewState: string
}

interface UIActions {
  // ... existing ...
  setMyNewState: (value: string) => void
}

// 在 create() 中添加:
myNewState: 'default',
setMyNewState: (value) => set({ myNewState: value }),

// 如需持久化，在 partialize 中添加:
partialize: (state) => ({
  compactMode: state.compactMode,
  language: state.language,
  myNewState: state.myNewState,  // 新增
}),
```

### React Query 约定

- **Query keys**: 在 `queryKeys` 对象中集中定义，使用 `as const` 断言
- **staleTime**: 默认 30 秒（QueryClient 配置）
- **Cache invalidation**: mutation `onSuccess` 中调用 `queryClient.invalidateQueries()`
- **跨实体 invalidation**: 删除 category 时同时 invalidate tasks（因为 task 关联 category）
- **Optimistic update**: 仅用于用户期望即时反馈的操作（complete/uncomplete/reorder）

---

## 5. 命名与文件组织规范

### 命名规则

| 语言/场景 | 规则 | 示例 |
|----------|------|------|
| Rust 文件名 | snake_case | `task.rs`, `my_entity.rs` |
| Rust struct | PascalCase | `CreateTaskInput` |
| Rust 函数 | snake_case | `create_task()` |
| Rust command 名 | snake_case | `#[tauri::command] pub fn create_task` |
| TS 文件名 (组件) | PascalCase | `TaskDetail.tsx` |
| TS 文件名 (非组件) | kebab-case 或 camelCase | `ui-store.ts`, `useDataQueries.ts` |
| TS 类型/接口 | PascalCase | `CreateTaskInput` |
| TS 函数/变量 | camelCase | `createTask`, `useTasksQuery` |
| React 组件 | function declaration, PascalCase | `function TaskList(): React.JSX.Element` |
| React Hook | `use` 前缀, camelCase | `useFilteredTasks` |
| CSS class | Tailwind utility classes | `cn('flex items-center', condition && 'text-red-500')` |
| i18n key | 点分层级 camelCase | `sidebar.addCategory`, `toast.importSuccess` |
| Query key | 数组, `as const` | `['tasks'] as const` |
| Invoke command | snake_case string | `invoke('create_task', { data })` |

### 文件组织规则

```
components/
├── MyComponent.tsx              # 小型独立组件
├── my-feature/                  # 大组件拆分为子目录
│   ├── index.ts                 # Barrel export
│   ├── MyFeature.tsx            # 主组件
│   ├── SubComponent.tsx         # 子组件
│   ├── hooks/                   # 特定于此 feature 的 hooks
│   │   └── useMyFeature.ts
│   └── utils/                   # 特定于此 feature 的工具函数
│       └── helpers.ts
```

### Import 顺序约定

```typescript
// 1. React / 外部库
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// 2. 内部 UI 组件 (@/components/ui/)
import { Button } from '@/components/ui/button'

// 3. 内部业务组件 / hooks / stores
import { useUIStore } from '@/stores/ui-store'
import { useTasksQuery } from '@/hooks/useDataQueries'

// 4. 类型 (type-only imports)
import type { Task, CreateTaskInput } from '@shared/types'
```

---

## 6. 数据库变更规范

### 新增表

在 `src-tauri/src/db/mod.rs` 的 `create_tables()` 函数中添加:

```rust
CREATE TABLE IF NOT EXISTS my_entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_my_entities_name ON my_entities(name);
```

### 新增迁移（修改现有表）

在 `run_migrations()` 的 `migrations` vec 中追加:

```rust
(5, "Add xxx column to yyy", Box::new(|conn| {
    let cols = get_column_names(conn, "yyy")?;
    if !cols.contains(&"xxx".to_string()) {
        conn.execute_batch("ALTER TABLE yyy ADD COLUMN xxx TEXT")?;
    }
    Ok(())
})),
```

关键规则:
- **Version 递增**: 当前最大 version 是 4，新迁移从 5 开始
- **幂等性**: 必须先检查列/索引是否已存在再执行变更
- **不可修改历史迁移**: 只追加新迁移，不修改已有迁移
- **使用 `get_column_names()` helper**: 检查表列是否存在

### SQL 约定

- 主键: `id TEXT PRIMARY KEY`（UUID 字符串）
- 外键: `REFERENCES xxx(id) ON DELETE CASCADE` 或 `ON DELETE SET NULL`
- 时间: `TEXT NOT NULL`（ISO 8601 格式 `YYYY-MM-DDTHH:MM:SS+00:00`）
- 布尔: `INTEGER NOT NULL DEFAULT 0`（SQLite 无 bool 类型）
- 枚举: `TEXT ... CHECK(xxx IN ('a', 'b', 'c'))`
- 排序: `sort_order INTEGER NOT NULL DEFAULT 0`

---

## 7. 组件开发规范

### 组件模板

```tsx
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { MyEntity } from '@shared/types'

interface MyComponentProps {
  entity: MyEntity
  onAction?: () => void
  className?: string
}

export function MyComponent({ entity, onAction, className }: MyComponentProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span>{entity.name}</span>
      {onAction && (
        <Button variant="ghost" size="sm" onClick={onAction}>
          {t('common.action')}
        </Button>
      )}
    </div>
  )
}
```

### 组件规范清单

- [ ] 使用 `function` declaration（非 arrow function）
- [ ] 显式标注返回类型 `React.JSX.Element`
- [ ] Props 定义为 interface（在同文件组件上方）
- [ ] 支持 `className` prop 并用 `cn()` 合并
- [ ] 所有用户可见文本使用 `t()` 国际化
- [ ] shadcn/ui 组件通过 `@/components/ui/xxx` 引入
- [ ] 无独立 CSS 文件，样式全部用 Tailwind

### shadcn/ui 组件安装

```bash
bunx --bun shadcn@latest add <component-name>
```

生成到 `src/mainview/components/ui/`，该目录有独立的 ESLint 放宽规则。

### Toast 通知

```typescript
import { toast } from 'sonner'
import i18n from '@/i18n'

// 成功
toast.success(i18n.t('toast.createSuccess'))

// 错误
toast.error(i18n.t('toast.createFailed'))
```

---

## 8. react-resizable-panels v4 规范

> 项目使用 v4，与 v3 有 **breaking changes**。

| 项目 | v4 用法 | v3 旧用法（禁止） |
|------|--------|-----------------|
| 方向 | `orientation="horizontal"` | ~~`direction="horizontal"`~~ |
| 尺寸 (百分比) | `defaultSize="35%"` (字符串) | ~~`defaultSize={35}`~~ (这在 v4 是 35px!) |
| 尺寸 (像素) | `defaultSize={350}` (数字) | N/A |
| Panel ID | 始终提供 `id` prop | 可选 |
| 组件名 | `Group` / `Panel` / `Separator` | ~~`PanelGroup` / `PanelGroupHandle`~~ |
| shadcn 包装 | `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle` | 同名但底层不同 |
| 持久化 | 手动 `useDefaultLayout` hook | ~~`autoSaveId`~~ |

---

## 9. Testing 规范

### 前端 (Vitest)

- 配置: `vitest.config.ts`
- 位置: 与源码同级的 `__tests__/` 目录
- 文件名: `*.test.ts` 或 `*.test.tsx`
- Property testing: 使用 `fast-check`

```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('myFunction', () => {
  it('should handle edge cases', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(myFunction(input)).toBeDefined()
      })
    )
  })
})
```

### 后端 (cargo test)

```bash
cd src-tauri && cargo test
```

---

## 10. Git Commit 规范

项目使用 Conventional Commits，CI 根据 commit message 自动决定版本号:

| Prefix | 版本变化 | 使用场景 |
|--------|---------|---------|
| `fix:` | patch (+0.0.1) | Bug 修复 |
| `feat:` | minor (+0.1.0) | 新功能 |
| `BREAKING CHANGE` | major (+1.0.0) | 破坏性变更 |
| `chore:` | 无版本变化 | 工具/配置/文档更新 |
| `refactor:` | 无版本变化 | 代码重构 |
| `style:` | 无版本变化 | 样式调整 |

```bash
git add -A
git commit -m "feat: 新增 XXX 功能"
git push   # 自动触发 CI → 版本升级 → 构建 → 发布
```

---

## 11. 常见开发场景速查

### 场景 A: 给现有实体添加新字段

1. `models/mod.rs` — struct 加字段 + Input 加字段
2. `shared/types.ts` — interface 加字段
3. `db/mod.rs` — `run_migrations()` 加 ALTER TABLE 迁移
4. `services/<domain>.rs` — 更新 row mapper + INSERT/UPDATE SQL
5. `rpc.ts` — 如果 API 签名变了则更新
6. 前端组件 — 使用新字段

### 场景 B: 添加新的筛选/排序维度

1. `models/mod.rs` — `TaskFilter` 加字段
2. `shared/types.ts` — `TaskFilter` 加字段
3. `services/task.rs` — `get_all_tasks()` 或 `search_tasks()` 处理新 filter
4. `ui-store.ts` — 如需 UI 状态则添加
5. 前端组件 — 添加筛选 UI

### 场景 C: 添加新的侧边栏视图

1. `ui-store.ts` — `FilterView` type 添加新值
2. `Layout.tsx` — 添加新视图的条件渲染分支
3. `AppSidebar.tsx` — 添加导航项
4. 新视图组件 — 创建对应组件
5. `i18n/locales/` — 添加翻译

### 场景 D: 添加键盘快捷键

1. `hooks/useKeyboardShortcuts.ts` — 添加快捷键处理
2. `CommandPalette.tsx` — 如需在命令面板中显示
3. `i18n/locales/` — 添加描述文本

---

## 12. Prettier / ESLint 配置速览

### Prettier (`.prettierrc`)

- 无分号 (no semicolons)
- 单引号 (single quotes)
- 2 空格缩进
- 无尾逗号 (trailing commas: none)
- 行宽 100 字符

### ESLint (`eslint.config.mjs`)

- ESLint v9 flat config
- `components/ui/` 目录放宽规则（自动生成代码）:
  - 不强制 `explicit-function-return-type`
  - 不强制 `react-refresh/only-export-components`
