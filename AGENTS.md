# AGENTS.md

## Project Overview

Watermelon (小西瓜) 是一款面向 macOS 的极简 Todo 管理桌面应用，UI 风格参考 Things 3。
支持任务分类、标签、子任务、重复任务、提醒通知、统计视图、简洁模式等功能。

## Tech Stack

- **Runtime / Package Manager**: Bun
- **Desktop Framework**: Electrobun (Bun runtime + Zig native bindings + system WebView)
- **UI Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 7 (standalone config, non-electron-vite)
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first config)
- **Component Library**: shadcn/ui (new-york style, Radix UI primitives)
- **Icons**: lucide-react
- **State Management**: Zustand 5 (UI state) + @tanstack/react-query 5 (server/async state)
- **Database**: bun:sqlite + Drizzle ORM (SQLite, WAL mode)
- **Resizable Panels**: react-resizable-panels v4 (⚠️ breaking API changes from v3, see below)
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable (task reordering)
- **Date Utilities**: date-fns
- **Charts**: recharts (Statistics view)
- **Testing**: Vitest + fast-check (property-based testing)
- **Linting**: ESLint 9 (flat config) + Prettier
- **Other**: uuid, sonner (toast), cmdk (command palette), react-day-picker, next-themes

## Project Structure

```
watermelon/
├── electrobun.config.ts          # Electrobun build config (app metadata, bun entrypoint, copy rules)
├── vite.config.ts                # Vite config for mainview (React + Tailwind, output to dist/)
├── vitest.config.ts              # Vitest test configuration
├── drizzle.config.ts             # Drizzle Kit config (schema inspection)
├── package.json                  # Dependencies & scripts (managed by Bun)
├── components.json               # shadcn/ui CLI configuration
├── tsconfig.json                 # Single unified TS config with path aliases
├── eslint.config.mjs             # ESLint v9 flat config
├── .prettierrc                   # Prettier rules
├── build/                        # App icons (icon.icns, icon.svg, icon_1024.png)
├── dist/                         # Vite build output (copied to Electrobun bundle by config)
├── src/
│   ├── shared/                   # Shared code between bun process & webview
│   │   ├── types.ts              # All domain types, input types, filter/stats types
│   │   └── rpc-schema.ts         # Typed RPC schema (WatermelonRPC) — single source of truth for IPC
│   ├── bun/                      # Bun main process (Electrobun backend)
│   │   ├── index.ts              # App entry: DB init, service wiring, RPC handlers, BrowserWindow
│   │   ├── db/
│   │   │   ├── index.ts          # Database init (bun:sqlite), migrations, WAL mode, table creation
│   │   │   ├── schema.ts         # Drizzle ORM schema (tasks, subTasks, categories, tags, taskTags)
│   │   │   └── __tests__/        # DB roundtrip & transaction tests
│   │   ├── services/
│   │   │   ├── task.service.ts       # Task & sub-task CRUD, completion, recurrence
│   │   │   ├── category.service.ts   # Category CRUD
│   │   │   ├── tag.service.ts        # Tag CRUD, task-tag associations
│   │   │   ├── search.service.ts     # Text search + filter (LIKE + AND conditions)
│   │   │   ├── data.service.ts       # Data import/export service
│   │   │   ├── notification.service.ts # macOS native notifications, scheduling
│   │   │   ├── statistics.service.ts # Stats summary & daily trend queries
│   │   │   └── __tests__/            # Service unit tests
│   │   └── utils/
│   │       ├── recurrence.ts     # Recurrence rule calculation (daily/weekly/monthly/custom)
│   │       ├── mappers.ts        # Data mapping/transformation utilities
│   │       └── __tests__/        # Recurrence tests
│   └── mainview/                 # React app (WebView, built by Vite)
│       ├── index.html            # HTML entry
│       ├── main.tsx              # React entry point (imports rpc.ts, StrictMode, ErrorBoundary)
│       ├── rpc.ts                # WebView RPC client: maps electrobun.rpc to window.api interface
│       ├── App.tsx               # Root component (renders Layout)
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
│       │   ├── TaskList.tsx      # Task list with search, sort, add, filter, drag-and-drop
│       │   ├── TaskDetail.tsx    # Task detail panel (edit title/desc, sub-tasks, tags, etc.)
│       │   ├── Statistics.tsx    # Stats dashboard (area chart, summary cards)
│       │   ├── CalendarView.tsx  # Calendar view for tasks
│       │   ├── CategoryDialog.tsx # Create/edit category dialog with color picker
│       │   ├── CommandPalette.tsx # Cmd+K command palette (cmdk)
│       │   ├── ThemeProvider.tsx # Theme provider (next-themes, light/dark mode)
│       │   ├── ErrorBoundary.tsx # React error boundary with retry UI
│       │   ├── task-list/        # Task list sub-components (SortableTaskItem, SubTaskRow, etc.)
│       │   └── ui/              # shadcn/ui generated components
│       ├── hooks/
│       │   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts (Cmd+N, Cmd+F, etc.)
│       │   ├── useDataQueries.ts        # React Query hooks for all CRUD operations
│       │   └── use-mobile.ts            # Mobile detection hook (shadcn)
│       └── utils/
│           ├── date-filters.ts  # Task date filtering (isOverdue, isUpcoming, filterToday)
│           ├── priority.ts      # Priority helpers (rank, color, label, badge classes)
│           └── __tests__/       # Utils tests
└── .build/                       # Electrobun build output (gitignored)
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

### `@bun/` — Bun process code (test only)

Maps to `src/bun/` and is configured in:

1. `vitest.config.ts` → `resolve.alias` (test runner resolution)

## Key Commands

```bash
bun run dev          # Start dev mode (Electrobun dev with --watch, auto-rebuild on file changes)
bun run start        # Build Vite first, then launch Electrobun dev (no watch)
bun run dev:hmr      # HMR mode: runs Vite dev server + Electrobun concurrently (hot reload)
bun run build        # Production build: Vite build + electrobun build --env=canary
bun run lint         # ESLint check
bun run format       # Prettier format
bun run test         # Run tests (vitest run)
bun run test:watch   # Run tests in watch mode (vitest)
```

### Dev Workflow

- **`bun run dev`** — 最常用的开发命令。Electrobun 的 `--watch` 模式会监听文件变化并自动重建 Bun 进程端代码。WebView 侧使用预构建的静态文件。
- **`bun run dev:hmr`** — 如果需要前端热更新 (HMR)，使用此命令。它会同时启动 Vite dev server (端口 6689) 和 Electrobun，WebView 会自动连接到 Vite dev server。
- **`bun run start`** — 先执行 `vite build` 构建前端静态文件到 `dist/`，然后启动 Electrobun dev。适合需要测试完整构建流程时使用。

## Adding shadcn/ui Components

```bash
bunx --bun shadcn@latest add <component-name>
```

Components are generated into `src/mainview/components/ui/` with `@/` import aliases. The `components/ui/` directory has relaxed ESLint rules (no `explicit-function-return-type`, no `react-refresh/only-export-components`) since these files are auto-generated.

## Architecture Conventions

### Electrobun Process Model

- **Bun process** (`src/bun/`): Bun runtime environment. Handles native OS features, database operations (via `bun:sqlite`), system notifications, file system access. Entry point: `src/bun/index.ts`.
- **WebView** (`src/mainview/`): System WebView (not bundled Chromium). Pure React app built by Vite. Communicates with Bun process via Electrobun's typed RPC.
- **No preload scripts**: Electrobun automatically injects RPC capabilities into the WebView. The `src/mainview/rpc.ts` file creates a `window.api` compatibility layer on top of `electrobun.rpc`.

### RPC Communication

- RPC schema defined in `src/shared/rpc-schema.ts` as `WatermelonRPC` type (fully typed request/response)
- **Bun side**: `src/bun/index.ts` uses `BrowserView.defineRPC<WatermelonRPC>()` to register all handlers
- **WebView side**: `src/mainview/rpc.ts` wraps `electrobun.rpc.request.xxx()` calls as `window.api.xxx()` for compatibility with existing React code
- **Error pattern**: Handlers wrap errors as `{ __error: AppError }`; renderer uses `unwrap()` to extract results or show toast
- **Type safety**: All RPC calls are fully typed end-to-end via the shared `WatermelonRPC` schema

### Database

- **Engine**: bun:sqlite (Bun 内置 SQLite 驱动) with WAL journal mode and foreign keys enabled
- **ORM**: Drizzle ORM (`drizzle-orm/bun-sqlite` adapter) for type-safe queries; raw SQL for table creation and migrations
- **Schema**: Defined in `src/bun/db/schema.ts` — 5 tables: `tasks`, `sub_tasks`, `categories`, `tags`, `task_tags`
- **Migrations**: Incremental via `ALTER TABLE` in `src/bun/db/index.ts` `runMigrations()`; no migration files
- **Location**: `Utils.paths.userData/watermelon.db` in production; `:memory:` for tests via `initTestDatabase()`
- **Indexes**: On `tasks(status)`, `tasks(category_id)`, `tasks(due_date)`, `tasks(priority)`, `sub_tasks(task_id)`, `task_tags(task_id)`, `task_tags(tag_id)`

### State Management

- **UI state**: Zustand store in `src/mainview/stores/ui-store.ts` — manages filterView, selectedTask, compactMode, searchQuery, theme, etc.
- **Server/async state**: @tanstack/react-query hooks in `src/mainview/hooks/useDataQueries.ts` — all CRUD operations (tasks, categories, tags, sub-tasks) with automatic cache invalidation
- **Legacy context**: `src/mainview/context/AppContext.tsx` (useReducer) — being migrated to the above stores
- Access UI state via `useUIStore()` selector hooks; access data via `useTasksQuery()`, `useCreateTask()`, etc.

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

### CSS / Theming

- Tailwind CSS v4 with CSS-first configuration (no `tailwind.config.js`)
- shadcn/ui theme variables defined in `src/mainview/index.css` using `oklch` color space
- Light and dark mode support via `.dark` class and `@custom-variant dark`
- Base color: neutral

### Testing

- **Framework**: Vitest (configured in `vitest.config.ts`)
- **Test location**: Co-located `__tests__/` directories next to source files
- **Pattern**: `src/**/__tests__/**/*.test.ts`
- **Environment**: Node (for bun-process service tests)
- **Database**: Uses in-memory SQLite (`initTestDatabase()`) for isolated tests
- **Property testing**: fast-check for recurrence rule edge cases
