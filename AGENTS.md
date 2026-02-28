# AGENTS.md

## Project Overview

小西瓜是一款面向 macOS 的极简 Todo 管理桌面应用，UI 风格参考 Things 3。
支持任务分类、标签、子任务、重复任务、提醒通知、统计视图、简洁模式等功能。

## Tech Stack

- **Package Manager**: Bun (前端依赖管理)
- **Desktop Framework**: Tauri v2 (Rust backend + system WebView)
- **Backend Language**: Rust (via Tauri, handles DB/notifications/window management)
- **UI Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 7 (standalone config)
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first config)
- **Component Library**: shadcn/ui (new-york style, Radix UI primitives)
- **Icons**: lucide-react
- **State Management**: Zustand 5 (UI state) + @tanstack/react-query 5 (server/async state)
- **Database**: rusqlite (bundled SQLite, WAL mode) — Rust 原生
- **Resizable Panels**: react-resizable-panels v4 (⚠️ breaking API changes from v3, see below)
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable (task reordering)
- **Date Utilities**: date-fns (frontend), chrono (Rust backend)
- **Charts**: recharts (Statistics view)
- **Testing**: Vitest + fast-check (前端 property-based testing), cargo test (Rust 后端)
- **Linting**: ESLint 9 (flat config) + Prettier (前端), Rust 编译器 warnings (后端)
- **Auto Update**: tauri-plugin-updater + tauri-plugin-process (GitHub Releases)
- **CI/CD**: GitHub Actions (auto version bump + build + release)
- **Other**: uuid, sonner (toast), cmdk (command palette), react-day-picker, next-themes, i18next

## Project Structure

```
watermelon/
├── vite.config.ts                # Vite config for mainview (React + Tailwind, output to dist/)
├── vitest.config.ts              # Vitest test configuration
├── package.json                  # Frontend dependencies & scripts (managed by Bun)
├── components.json               # shadcn/ui CLI configuration
├── tsconfig.json                 # TypeScript config with path aliases
├── eslint.config.mjs             # ESLint v9 flat config
├── .prettierrc                   # Prettier rules
├── build/                        # App icons (icon.icns, icon.svg, icon_1024.png, icon.iconset/)
├── dist/                         # Vite build output (referenced by Tauri as frontendDist)
├── src-tauri/                    # Tauri v2 Rust backend
│   ├── Cargo.toml                # Rust dependencies (tauri, rusqlite, serde, uuid, chrono, etc.)
│   ├── tauri.conf.json           # Tauri app config (productName, window, bundle, plugins)
│   ├── capabilities/default.json # Tauri v2 capability permissions
│   ├── build.rs                  # Tauri build script
│   ├── icons/                    # App icons for Tauri bundling
│   └── src/
│       ├── main.rs               # Rust entry point
│       ├── lib.rs                # Tauri Builder setup, plugin/state registration, command handler
│       ├── db/
│       │   └── mod.rs            # SQLite init (rusqlite), WAL mode, table creation, migrations
│       ├── models/
│       │   └── mod.rs            # All domain structs (Task, SubTask, Category, Tag, inputs, filters, etc.)
│       ├── services/
│       │   ├── mod.rs
│       │   ├── task.rs           # Task & sub-task CRUD, completion/uncompletion, recurrence, reorder
│       │   ├── category.rs       # Category CRUD
│       │   ├── tag.rs            # Tag CRUD, task-tag associations
│       │   ├── search.rs         # Text search + filter (LIKE + AND conditions)
│       │   ├── data.rs           # Data import/export (JSON)
│       │   ├── notification.rs   # macOS native notifications via tauri-plugin-notification
│       │   └── statistics.rs     # Stats summary & daily trend queries
│       ├── commands/
│       │   └── mod.rs            # All #[tauri::command] handlers (~30 commands)
│       └── utils/
│           ├── mod.rs
│           └── recurrence.rs     # Recurrence rule calculation (daily/weekly/monthly/custom)
├── src/
│   ├── shared/                   # Shared TypeScript types (frontend reference)
│   │   └── types.ts              # All domain types, input types, filter/stats types
│   └── mainview/                 # React app (WebView, built by Vite)
│       ├── index.html            # HTML entry
│       ├── main.tsx              # React entry point (imports rpc.ts, StrictMode, ErrorBoundary)
│       ├── rpc.ts                # Tauri invoke wrapper: maps invoke('cmd') to window.api interface
│       ├── App.tsx               # Root component (renders Layout + UpdateDialog)
│       ├── index.css             # Tailwind CSS entry + shadcn theme variables (oklch)
│       ├── env.d.ts              # Vite client + window.api type declarations
│       ├── lib/
│       │   └── utils.ts          # cn() utility (clsx + tailwind-merge)
│       ├── context/
│       │   └── AppContext.tsx     # Global state (useReducer) + all async action creators
│       ├── stores/
│       │   └── ui-store.ts       # Zustand UI state (filterView, selectedTask, compactMode, etc.)
│       ├── i18n/
│       │   ├── index.ts          # i18next initialization
│       │   └── locales/          # zh-CN, en translations
│       ├── components/
│       │   ├── Layout.tsx        # Three-panel layout (Sidebar | TaskList | Detail)
│       │   ├── AppSidebar.tsx    # Sidebar navigation (views, categories, tags)
│       │   ├── TaskDetail.tsx    # Task detail panel (edit title/desc, sub-tasks, tags, etc.)
│       │   ├── Statistics.tsx    # Stats dashboard (area chart, summary cards)
│       │   ├── CalendarView.tsx  # Calendar view for tasks
│       │   ├── CategoryDialog.tsx # Create/edit category dialog with color picker
│       │   ├── CommandPalette.tsx # Cmd+K command palette (cmdk)
│       │   ├── ThemeProvider.tsx # Theme provider (next-themes, light/dark mode)
│       │   ├── ErrorBoundary.tsx # React error boundary with retry UI
│       │   ├── UpdateDialog.tsx  # Auto-update prompt dialog with progress bar
│       │   ├── RichTextEditor.tsx # TipTap rich text editor
│       │   ├── task-detail/      # Task detail sub-components
│       │   ├── task-list/        # Task list sub-components (SortableTaskItem, SubTaskRow, etc.)
│       │   └── ui/              # shadcn/ui generated components
│       ├── hooks/
│       │   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts (Cmd+N, Cmd+F, etc.)
│       │   ├── useDataQueries.ts        # React Query hooks for all CRUD operations
│       │   ├── useAutoUpdate.ts         # Auto-update check hook (tauri-plugin-updater)
│       │   └── use-mobile.ts            # Mobile detection hook (shadcn)
│       └── utils/
│           ├── date-filters.ts  # Task date filtering (isOverdue, isUpcoming, filterToday)
│           ├── priority.ts      # Priority helpers (rank, color, label, badge classes)
│           └── __tests__/       # Utils tests
├── .github/
│   └── workflows/
│       └── release.yml          # Auto release: version bump → build → publish GitHub Release
└── artifacts/                    # Final distributable artifacts (DMG, etc.)
```

## Path Aliases

### `@/` — MainView source

Maps to `src/mainview/` and is configured in two places:

1. `tsconfig.json` → `compilerOptions.paths` (TypeScript resolution + shadcn CLI)
2. `vite.config.ts` → `resolve.alias` (Vite bundler resolution)

### `@shared/` — Shared code

Maps to `src/shared/` and is configured in:

1. `tsconfig.json` → `compilerOptions.paths` (TypeScript resolution)
2. `vite.config.ts` → `resolve.alias` (Vite bundler resolution)

## Key Commands

```bash
bun run dev          # Start Tauri dev mode (Vite dev server + Rust backend, HMR enabled)
bun run build        # Production build: Tauri build (compiles Rust + bundles frontend)
bun run vite:dev     # Start Vite dev server only (port 6689)
bun run vite:build   # Build frontend only (output to dist/)
bun run lint         # ESLint check
bun run format       # Prettier format
bun run test         # Run frontend tests (vitest run)
bun run test:watch   # Run tests in watch mode (vitest)
```

### Build & Distribution

- **`bun run build`** — 执行 `tauri build`，先构建 Vite 前端到 `dist/`，然后编译 Rust 后端并打包为 `.app` bundle。
- **构建产物**: `src-tauri/target/release/bundle/` 目录下包含 `.app`、`.dmg` 等可分发文件。
- **Rust 后端编译**: 首次构建需要下载并编译所有 Rust crate 依赖（约 500+ packages），后续增量编译很快。

### Dev Workflow

- **`bun run dev`** — 最常用的开发命令。Tauri 会同时启动 Vite dev server (端口 6689, HMR) 和 Rust 后端。前端修改即时热更新，Rust 修改会自动重新编译并重启。
- **`bun run vite:dev`** — 仅启动前端 dev server，适合只调试前端样式/组件时使用。

## Adding shadcn/ui Components

```bash
bunx --bun shadcn@latest add <component-name>
```

Components are generated into `src/mainview/components/ui/` with `@/` import aliases. The `components/ui/` directory has relaxed ESLint rules (no `explicit-function-return-type`, no `react-refresh/only-export-components`) since these files are auto-generated.

## Architecture Conventions

### App Naming

- 应用名为"小西瓜"，在 `src-tauri/tauri.conf.json` 中通过 `productName` 和窗口 `title` 配置。
- Tauri 原生支持中文应用名，无需额外脚本处理。
- Bundle identifier: `com.xiao-xigua.watermelon`

### Tauri v2 Process Model

- **Rust backend** (`src-tauri/src/`): Rust 进程，处理数据库操作 (rusqlite)、系统通知 (tauri-plugin-notification)、窗口管理、文件系统访问。Entry point: `src-tauri/src/main.rs` → `lib.rs`。
- **WebView** (`src/mainview/`): System WebView (not bundled Chromium). Pure React app built by Vite. Communicates with Rust backend via Tauri `invoke()` commands.
- **State management**: Database (`db::Database`) 和 NotificationState 通过 Tauri 的 `app.manage()` 注册为全局状态，commands 通过 `State<T>` 访问。

### IPC Communication (Tauri invoke)

- **Rust side**: `src-tauri/src/commands/mod.rs` 定义所有 `#[tauri::command]` 函数，在 `lib.rs` 中通过 `generate_handler![]` 注册
- **WebView side**: `src/mainview/rpc.ts` 使用 `@tauri-apps/api/core` 的 `invoke()` 封装为 `window.api.xxx()` 接口
- **Error pattern**: Commands 返回 `Result<T, String>`，错误时 String 是 JSON 序列化的 AppError，前端通过 rejected promise 接收
- **Command naming**: Rust 使用 snake_case (`create_task`)，前端调用时也使用 snake_case (`invoke('create_task', { data })`)

### Database

- **Engine**: rusqlite (bundled SQLite) with WAL journal mode and foreign keys enabled
- **Schema**: 5 tables: `tasks`, `sub_tasks`, `categories`, `tags`, `task_tags`；定义在 `src-tauri/src/db/mod.rs`
- **Migrations**: 4 个增量迁移，通过 `schema_version` 表跟踪版本，在 `db/mod.rs` 的 `run_migrations()` 中执行
- **Location**: `app.path().app_data_dir()` / `watermelon.db` in production
- **Indexes**: On `tasks(status)`, `tasks(category_id)`, `tasks(due_date)`, `tasks(priority)`, `tasks(completed_at)`, `tasks(sort_order)`, `sub_tasks(task_id)`, `sub_tasks(parent_id)`, `task_tags(task_id)`, `task_tags(tag_id)`
- **Data compatibility**: SQLite 文件格式通用，从旧版 Electrobun 迁移的数据库文件可直接读取

### State Management (Frontend)

- **UI state**: Zustand store in `src/mainview/stores/ui-store.ts` — manages filterView, selectedTask, compactMode, searchQuery, theme, etc.
- **Server/async state**: @tanstack/react-query hooks in `src/mainview/hooks/useDataQueries.ts` — all CRUD operations (tasks, categories, tags, sub-tasks) with automatic cache invalidation
- **Legacy context**: `src/mainview/context/AppContext.tsx` (useReducer) — being migrated to the above stores
- Access UI state via `useUIStore()` selector hooks; access data via `useTasksQuery()`, `useCreateTask()`, etc.

### Window Drag Region

- macOS `titleBarStyle: Overlay` 模式下，窗口拖拽通过 `data-tauri-drag-region` HTML 属性实现
- CSS class `.drag-region` 提供 `app-region: drag` 样式作为补充
- 交互元素需要 `.no-drag` class 或 `app-region: no-drag` 以避免被拖拽区域拦截

### react-resizable-panels v4

⚠️ **Breaking changes from v3** — the installed version is v4, which has a significantly different API:

- **Component names**: `Group` (was `PanelGroup`), `Panel`, `Separator` (was `PanelGroupHandle`). shadcn wraps these as `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`.
- **Orientation**: Use `orientation="horizontal"` (v3 used `direction="horizontal"`)
- **Size values**: Numeric values = **pixels**, string values = **percentages**. Use `defaultSize="35%"` not `defaultSize={35}` (which would be 35px!)
- **No `autoSaveId`**: Persistence must be done manually via `useDefaultLayout` hook + `defaultLayout`/`onLayoutChanged` props
- **Panel `id` recommended**: Always provide `id` prop on panels for stable identification

### Coding Style

- TypeScript strict mode enabled
- All functions require explicit return types (except shadcn/ui generated components)
- Use `cn()` from `@/lib/utils` for conditional class merging
- Prettier: no semicolons, single quotes, 2-space indent, trailing commas: none, 100 char width
- React components: function declarations (not arrow functions for top-level components)
- Rust: standard formatting (`cargo fmt`), derive macros for serde serialization

### CSS / Theming

- Tailwind CSS v4 with CSS-first configuration (no `tailwind.config.js`)
- shadcn/ui theme variables defined in `src/mainview/index.css` using `oklch` color space
- Light and dark mode support via `.dark` class and `@custom-variant dark`
- Base color: neutral

### Testing

- **Frontend**: Vitest (configured in `vitest.config.ts`)
  - Test location: Co-located `__tests__/` directories next to source files
  - Pattern: `src/**/__tests__/**/*.test.ts`
  - Property testing: fast-check for edge cases
- **Backend (Rust)**: `cargo test` in `src-tauri/`
  - Rust 服务层可独立单元测试

### Auto Update

- **Plugin**: `tauri-plugin-updater` (Rust) + `@tauri-apps/plugin-updater` (JS)
- **Signing**: Ed25519 key pair generated via `tauri signer generate`, pubkey configured in `tauri.conf.json`
- **Endpoint**: `https://github.com/iKrelve/watermelon/releases/latest/download/latest.json`
- **Frontend**: `useAutoUpdate` hook checks for updates 3 seconds after app startup; `UpdateDialog` component shows version info, release notes, and download progress
- **Flow**: App starts → check `latest.json` → compare versions → prompt user → download & install → relaunch

### CI/CD & Release

- **Repository**: GitHub public repo `iKrelve/watermelon`
- **Git remote**: `origin` = `https://github.com/iKrelve/watermelon.git`
- **Trigger**: Push to `master` branch automatically triggers the release pipeline
- **Pipeline** (`.github/workflows/release.yml`):
  1. **Version bump**: Analyzes commit messages (conventional commits) to determine semver bump
     - `fix:` → patch (+0.0.1)
     - `feat:` → minor (+0.1.0)
     - `BREAKING CHANGE` → major (+1.0.0)
  2. **Update files**: Automatically updates version in `package.json`, `Cargo.toml`, `tauri.conf.json`
  3. **Tag & commit**: Creates version bump commit and git tag `vX.Y.Z`
  4. **Build**: Compiles universal macOS binary (aarch64 + x86_64) on GitHub Actions
  5. **Release**: Publishes GitHub Release with `.dmg`, update `.tar.gz`, signatures, and `latest.json`
- **Secrets required**: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **Signing key**: Stored at `~/.tauri/watermelon.key` (private) and `~/.tauri/watermelon.key.pub` (public)
- **Daily workflow**: Just push to master with conventional commit messages → everything else is automatic

### Release Workflow (发版流程)

推送到 `master` 分支后全自动发版，无需手动操作：

```bash
# 日常开发发版
git add -A
git commit -m "feat: 新增XX功能"     # feat → minor (+0.1.0)
git commit -m "fix: 修复XX问题"      # fix → patch (+0.0.1)
git push                              # 推到 GitHub → 自动触发 CI
```

CI 自动完成：版本号升级 → 更新 package.json/Cargo.toml/tauri.conf.json → 打 tag → 构建 macOS universal binary → 发布 GitHub Release（含 .dmg + 更新包 + latest.json）

已安装用户启动应用 3 秒后自动检测新版本，弹窗提示下载安装。

首次配置需要：
1. `bunx tauri signer generate -w ~/.tauri/watermelon.key` 生成签名密钥
2. 在 GitHub Secrets 配置 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### Git Identity (多仓库身份隔离)

- 此仓库使用独立的 Git 身份配置（`git config` 不带 `--global`），避免美团内部邮箱暴露在 GitHub 公开仓库
- 仓库级配置：`user.name = "iKrelve"`, `user.email = "iKrelve@users.noreply.github.com"`
- 这不会影响其他项目的全局 Git 配置
