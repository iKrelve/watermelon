# AGENTS.md

## Project Overview

小西瓜（Watermelon）是一款面向 macOS 的极简 Todo 管理桌面应用，UI 风格参考 Things 3。
支持任务分类、标签、子任务、重复任务、提醒通知、统计视图、简洁模式等功能。

**Tech stack**: Tauri v2 (Rust + WebView) / React 19 + TypeScript 5.9 / Vite 7 / Tailwind CSS v4 / shadcn/ui
**Package manager**: Bun (use `bun install`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Tauri v2 (Rust backend + system WebView) |
| Backend | Rust — rusqlite (SQLite, WAL mode), chrono, uuid, serde |
| Frontend | React 19 + TypeScript 5.9, Vite 7 |
| CSS | Tailwind CSS v4 (CSS-first, `@tailwindcss/vite` plugin) |
| Components | shadcn/ui (new-york style, Radix UI) + lucide-react icons |
| Rich Text | TipTap (@tiptap/react + starter-kit + task-list) |
| State | Zustand 5 (UI state) + @tanstack/react-query 5 (server state) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | recharts |
| i18n | i18next (zh-CN, en) |
| Package Manager | Bun |
| Testing | Vitest + fast-check (frontend), cargo test (Rust) |
| Linting | ESLint 9 (flat config) + Prettier |
| Panels | react-resizable-panels **v4** (breaking API vs v3, see CODING_GUIDELINES.md) |
| Auto Update | tauri-plugin-updater + tauri-plugin-process |
| CI/CD | GitHub Actions (conventional commits → auto version bump → release) |

## Development Commands

### Primary Commands

- `bun run dev` — Start Tauri dev mode (Vite HMR + Rust backend)
- `bun run vite:dev` — Vite dev server only (port 6689, for frontend-only iteration)
- `bun run lint` — ESLint check
- `bun run format` — Prettier format
- `bun run test` — Run frontend tests (vitest run)
- `bun run test:watch` — Tests watch mode

### Build Commands (slow — avoid during development)

- `bun run build` — Production build (Tauri build → .app/.dmg)
- `bun run vite:build` — Frontend build only (→ dist/)

### Backend Tests

```bash
cd src-tauri && cargo test
```

### Package Management

- **Install all deps**: `bun install`
- **Add frontend package**: `bun add <package>`
- **Add shadcn component**: `bunx --bun shadcn@latest add <component-name>`
- **Rebuild Rust deps**: `cd src-tauri && cargo build`

## Project Structure

```
watermelon/
├── AGENTS.md                     # Agent 快速参考（本文件）— What & Where
├── CODING_GUIDELINES.md          # Agent 编码规范与端到端开发流程 — How
├── vite.config.ts                # Vite config (React + Tailwind, output → dist/)
├── vitest.config.ts              # Vitest test config
├── package.json                  # Frontend deps & scripts (Bun)
├── components.json               # shadcn/ui CLI config
├── tsconfig.json                 # TypeScript config (path aliases)
├── eslint.config.mjs             # ESLint v9 flat config
├── .prettierrc                   # Prettier rules
│
├── src-tauri/                    # ── Rust Backend (Tauri) ──
│   ├── Cargo.toml
│   ├── tauri.conf.json           # App config (productName, window, bundle, plugins)
│   ├── capabilities/default.json # Tauri v2 permissions
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # Tauri Builder: plugin/state registration, generate_handler!
│       ├── db/mod.rs             # SQLite init, schema, migrations
│       ├── models/mod.rs         # All domain structs & input/filter/error types
│       ├── services/             # Business logic (task, category, tag, search, statistics, data, notification)
│       ├── commands/mod.rs       # All #[tauri::command] handlers (~30 commands)
│       └── utils/recurrence.rs   # Recurrence rule calculation
│
├── src/
│   ├── shared/types.ts           # Shared TS types (mirrors models/mod.rs)
│   ├── bun/                      # ── Electrobun Backend (alternative runtime) ──
│   │   ├── index.ts              # Electrobun entry: RPC handlers, window creation
│   │   ├── db/                   # SQLite init & schema (bun:sqlite)
│   │   ├── services/             # Business logic (mirrors src-tauri/src/services/)
│   │   └── utils/                # Mappers, recurrence helpers
│   └── mainview/                 # ── React App (WebView) ──
│       ├── main.tsx              # React entry (StrictMode, ErrorBoundary, providers)
│       ├── rpc.ts                # Tauri invoke wrapper → window.api.*
│       ├── App.tsx               # Root component (Layout + UpdateDialog)
│       ├── env.d.ts              # window.api type declaration
│       ├── index.css             # Tailwind entry + shadcn theme (oklch)
│       ├── lib/utils.ts          # cn() utility
│       ├── context/AppContext.tsx # QueryClientProvider (React Query)
│       ├── stores/ui-store.ts    # Zustand UI state
│       ├── i18n/                 # i18next init + zh-CN/en locales
│       ├── hooks/                # useDataQueries, useKeyboardShortcuts, useAutoUpdate, use-mobile
│       ├── components/           # Business components
│       │   ├── Layout.tsx        # Three-panel layout (Sidebar | TaskList | Detail)
│       │   ├── AppSidebar.tsx    # Sidebar navigation
│       │   ├── TaskDetail.tsx    # Task detail panel
│       │   ├── CalendarView.tsx  # Calendar date-based view
│       │   ├── Statistics.tsx    # Stats dashboard (recharts)
│       │   ├── CommandPalette.tsx # Cmd+K command palette
│       │   ├── CategoryDialog.tsx # Category CRUD dialog
│       │   ├── RichTextEditor.tsx # TipTap rich text editor
│       │   ├── ThemeProvider.tsx  # Dark/light theme (next-themes)
│       │   ├── UpdateDialog.tsx   # Auto-update dialog
│       │   ├── ErrorBoundary.tsx  # React error boundary
│       │   ├── task-list/        # Task list sub-components (barrel: index.ts)
│       │   ├── task-detail/      # Task detail sub-components (barrel: index.ts)
│       │   └── ui/              # shadcn/ui generated (auto-generated, relaxed lint)
│       └── utils/                # date-filters, priority helpers, __tests__/
│
├── .github/workflows/release.yml # CI: version bump → build → GitHub Release
├── build/                        # App icons
└── artifacts/                    # Build output (DMG, etc.)
```

## Quick Reference — Key File Responsibilities

> Agent 在开发时需频繁访问的文件速查表。

| 要做什么 | 改哪个文件 |
|---------|-----------|
| 定义/修改 Rust 数据结构 | `src-tauri/src/models/mod.rs` |
| 定义/修改 TS 类型 | `src/shared/types.ts` |
| 实现后端业务逻辑 | `src-tauri/src/services/<domain>.rs` |
| 注册新 service module | `src-tauri/src/services/mod.rs` |
| 创建 Tauri command | `src-tauri/src/commands/mod.rs` |
| 注册 command handler | `src-tauri/src/lib.rs` → `generate_handler![]` |
| 添加前端 IPC 调用 | `src/mainview/rpc.ts` |
| 添加 React Query hook | `src/mainview/hooks/useDataQueries.ts` |
| 管理 UI 状态 | `src/mainview/stores/ui-store.ts` |
| 添加 UI 组件 | `src/mainview/components/` |
| 添加国际化文本 | `src/mainview/i18n/locales/zh-CN.ts` + `en.ts` |
| 数据库 schema 变更 | `src-tauri/src/db/mod.rs` |
| 添加 Tauri 权限 | `src-tauri/capabilities/default.json` |

## Adding a New Feature — Checklist

新增功能时按此顺序操作（详见 `CODING_GUIDELINES.md`）：

1. **Rust models** — `models/mod.rs` 定义 struct（`#[serde(rename_all = "camelCase")]`）
2. **TS types** — `shared/types.ts` 定义对应 interface（保持字段一一对应）
3. **Rust service** — `services/<domain>.rs` 实现业务逻辑
4. **Register module** — `services/mod.rs` 添加 `pub mod <domain>;`
5. **Rust command** — `commands/mod.rs` 定义 `#[tauri::command]` handler
6. **Register handler** — `lib.rs` 在 `generate_handler![]` 中添加
7. **RPC wrapper** — `rpc.ts` 添加 `window.api.<method>()` 调用
8. **React Query hook** — `useDataQueries.ts` 添加 query/mutation hook
9. **UI component** — `components/` 中创建组件
10. **i18n** — 更新 `zh-CN.ts` 和 `en.ts`
11. **Test** — 添加单元测试（前端 Vitest / 后端 cargo test）

## Path Aliases

| Alias | Maps to | Configured in |
|-------|---------|--------------|
| `@/` | `src/mainview/` | `tsconfig.json` + `vite.config.ts` |
| `@shared/` | `src/shared/` | `tsconfig.json` + `vite.config.ts` |

## Strict Code Rules (non-negotiable)

### TypeScript / Frontend

- **Never add `@ts-nocheck`** — fix the root cause instead.
- **Never add `@ts-ignore`** — use proper type narrowing or explicit type assertions.
- **Never use `any`** without an inline comment explaining why it is unavoidable.
- **Never add `eslint-disable`** without an inline comment explaining the justification.
- **Never edit files in `dist/`** — these are generated output. Edit source files instead.
- **Never manually edit files in `components/ui/`** — these are auto-generated by shadcn/ui. Use `bunx --bun shadcn@latest add <name>` to install or update.
- **All functions must have explicit return types** — except auto-generated `ui/` components.
- **All user-visible text must use `t()` i18n** — never hardcode Chinese or English strings.

### Rust / Backend

- **All structs must use `#[serde(rename_all = "camelCase")]`** — ensures automatic snake_case → camelCase conversion for frontend.
- **Never modify existing database migration entries** — only append new migrations with incremented version numbers.
- **All new migrations must be idempotent** — check if column/index exists before ALTER.
- **Rust models and TS types must always be in sync** — when modifying `models/mod.rs`, always update `shared/types.ts` in the same commit.

### General

- **Never commit `console.log` debug statements** — remove before committing.
- **Never use `eslint-disable-next-line` on more than one consecutive line** — refactor the code instead.

## Command Restrictions

| Forbidden | Reason | Use Instead |
|-----------|--------|-------------|
| `bun run build` during dev | Very slow full Tauri build (~5 min) | `bun run dev` or `bun run vite:dev` |
| `cargo build` alone | Missing Tauri context/plugins | `bun run dev` (runs Tauri dev mode) |
| Editing `dist/` files | Generated output, overwritten on build | Edit source files in `src/` |
| Editing `components/ui/*` | Auto-generated by shadcn | `bunx --bun shadcn@latest add <name>` |
| Editing `node_modules/` | Overwritten on install | Fix in source or patch via `package.json` |
| `git push` to `master` without checking | Auto-triggers CI release | Verify commit message prefix (`fix:`, `feat:`, `chore:`) |

## Architecture Conventions

### Tauri v2 Process Model

- **Rust backend** (`src-tauri/src/`): 数据库 (rusqlite)、通知、窗口管理。入口 `main.rs` → `lib.rs`。
- **WebView** (`src/mainview/`): React app (Vite build)。通过 `invoke()` 与 Rust 通信。
- **Global state**: `Database` 和 `NotificationState` 通过 `app.manage()` 注册，commands 通过 `State<T>` 访问。

### IPC Communication

- Rust: `#[tauri::command]` 在 `commands/mod.rs`，返回 `Result<T, String>`
- Frontend: `rpc.ts` 用 `invoke()` 封装为 `window.api.xxx()`
- Error: String 是 JSON 序列化的 `AppError`，前端通过 rejected promise 接收
- Naming: Rust `snake_case`（`create_task`），rpc.ts `camelCase`（`createTask`）

### Database

- **Engine**: rusqlite (bundled SQLite, WAL mode, foreign keys ON)
- **Tables**: `tasks`, `sub_tasks`, `categories`, `tags`, `task_tags`
- **Migrations**: `schema_version` 表跟踪，`run_migrations()` 执行增量迁移
- **Location**: `app.path().app_data_dir()` / `watermelon.db`

### State Management

| 类型 | 工具 | 文件 | 用途 |
|-----|------|------|------|
| UI state | Zustand | `stores/ui-store.ts` | filterView, selectedTask, compactMode, searchQuery, language |
| Server state | React Query | `hooks/useDataQueries.ts` | tasks, categories, tags, stats CRUD |
| Query client | React Query | `context/AppContext.tsx` | QueryClientProvider (staleTime=30s) |

### Coding Style

- **TypeScript**: strict mode enabled. Run `bun run lint` after changes to verify.
- **Prettier**: no semicolons, single quotes, 2-space indent, trailing commas: none, 100 char width. Run `bun run format` to auto-fix.
- **React**: always use `function` declarations for top-level components (never arrow functions). Always annotate return type as `React.JSX.Element`.
- **CSS**: Tailwind utility classes only + `cn()` from `@/lib/utils`. Never create separate CSS files.
- **Rust**: always run `cargo fmt`. Always add `#[serde(rename_all = "camelCase")]` on all types.
- **shadcn/ui**: install via `bunx --bun shadcn@latest add <name>`. Never copy-paste from docs manually.

### Window Drag Region

- macOS `titleBarStyle: Overlay` → `data-tauri-drag-region` HTML attribute
- Interactive elements must have `.no-drag` class

### App Naming

- 应用名: "小西瓜"，Bundle ID: `com.xiao-xigua.watermelon`

## Testing Instructions

### Frontend (Vitest)

- **Run**: `bun run test` (single run) or `bun run test:watch` (watch mode)
- **Config**: `vitest.config.ts`
- **Test location**: `src/mainview/utils/__tests__/` (co-located with source)
- **File naming**: `*.test.ts` or `*.test.tsx`
- **Property testing**: use `fast-check` for edge-case coverage

### Backend (cargo test)

- **Run**: `cd src-tauri && cargo test`
- **Test location**: `#[cfg(test)]` module inside each `services/<domain>.rs`

## Git Workflow

### Commit Convention

Must use Conventional Commits — CI auto-bumps version based on prefix:

| Prefix | Version Bump | Use For |
|--------|-------------|---------|
| `fix:` | patch (+0.0.1) | Bug fixes |
| `feat:` | minor (+0.1.0) | New features |
| `BREAKING CHANGE` | major (+1.0.0) | Breaking changes |
| `chore:` | none | Tooling, config, docs |
| `refactor:` | none | Code restructuring |

### CI/CD Pipeline

Push to `master` triggers: version bump → update `package.json` / `Cargo.toml` / `tauri.conf.json` → tag → build universal macOS binary → GitHub Release.

### Git Identity

仓库级配置（非 global）: `user.name = "iKrelve"`, `user.email = "iKrelve@users.noreply.github.com"`

## Dependency Recovery

If dependencies are missing or corrupted:

| Problem | Recovery Command |
|---------|-----------------|
| Frontend deps missing | `bun install` |
| Rust deps missing | `cd src-tauri && cargo build` |
| shadcn component missing | `bunx --bun shadcn@latest add <component-name>` |
| Lock file conflict | Delete `bun.lock`, run `bun install` |
| Rust lock file conflict | Delete `src-tauri/Cargo.lock`, run `cd src-tauri && cargo build` |

## Self-Maintenance of AGENTS.md

**MANDATORY post-task check** — After completing ANY task that changes project structure:

| # | Question (YES = update required) | What to Update |
|---|----------------------------------|----------------|
| 1 | Created a new directory? | Add to Project Structure tree |
| 2 | Added a new public component? | Add to Project Structure tree under `components/` |
| 3 | Added a new Tauri command? | Verify Quick Reference table is still accurate |
| 4 | Established a new architectural pattern? | Add to Architecture Conventions |
| 5 | Changed a convention or tool? | Update affected section |
| 6 | Added a new dependency with version-specific behavior? | Add to Tech Stack table |

**If ALL answers are NO** — skip update.
**Do NOT update for**: bug fixes, minor refactors, following existing patterns.
