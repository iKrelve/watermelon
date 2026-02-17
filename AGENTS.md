# AGENTS.md

## Project Overview

Watermelon (小西瓜) 是一款面向 macOS 的极简 Todo 管理桌面应用，UI 风格参考 Things 3。
支持任务分类、标签、子任务、重复任务、提醒通知、统计视图、简洁模式等功能。

## Tech Stack

- **Runtime / Package Manager**: Bun
- **Desktop Framework**: Electron 40 + electron-vite 5
- **UI Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 7 (via electron-vite)
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first config)
- **Component Library**: shadcn/ui (new-york style, Radix UI primitives)
- **Icons**: lucide-react
- **State Management**: Zustand 5 (UI state) + @tanstack/react-query 5 (server/async state)
- **Database**: better-sqlite3 + Drizzle ORM (SQLite, WAL mode)
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
├── electron.vite.config.ts       # Unified build config (main / preload / renderer)
├── vitest.config.ts              # Vitest test configuration
├── drizzle.config.ts             # Drizzle Kit config (schema inspection)
├── package.json                  # Dependencies & scripts (managed by Bun)
├── components.json               # shadcn/ui CLI configuration
├── tsconfig.json                 # Root TS config with path aliases
├── tsconfig.node.json            # TS config for main + preload + shared (Node env)
├── tsconfig.web.json             # TS config for renderer (DOM + JSX)
├── eslint.config.mjs             # ESLint v9 flat config
├── .prettierrc                   # Prettier rules
├── build/                        # App icons (icon.icns, icon.svg, icon_1024.png)
├── src/
│   ├── shared/                   # Shared code between main & renderer
│   │   ├── types.ts              # All domain types, input types, filter/stats types
│   │   └── ipc-channels.ts       # IPC channel name constants (single source of truth)
│   ├── main/                     # Electron main process
│   │   ├── index.ts              # BrowserWindow creation, service init, compact mode
│   │   ├── db/
│   │   │   ├── index.ts          # Database init, migrations, WAL mode, table creation
│   │   │   ├── schema.ts         # Drizzle ORM schema (tasks, subTasks, categories, tags, taskTags)
│   │   │   └── __tests__/        # DB roundtrip & transaction tests
│   │   ├── ipc/
│   │   │   └── handlers.ts       # All IPC handler registration (maps channels to services)
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
│   ├── preload/                  # Preload scripts (contextBridge)
│   │   ├── index.ts              # Exposes typed `window.api` to renderer
│   │   └── index.d.ts            # Type declarations for `window.api` (XiaoXiguaApi)
│   └── renderer/                 # React app (Vite project)
│       ├── index.html            # HTML entry
│       └── src/
│           ├── main.tsx          # React entry point (StrictMode, ErrorBoundary, AppProvider)
│           ├── App.tsx           # Root component (renders Layout)
│           ├── index.css         # Tailwind CSS entry + shadcn theme variables (oklch)
│           ├── env.d.ts          # Vite client type declarations
│           ├── lib/
│           │   └── utils.ts      # cn() utility (clsx + tailwind-merge)
│           ├── context/
│           │   └── AppContext.tsx # Global state (useReducer) + all async action creators
│           ├── stores/
│           │   └── ui-store.ts       # Zustand UI state (filterView, selectedTask, compactMode, etc.)
│           ├── components/
│           │   ├── Layout.tsx        # Three-panel layout (Sidebar | TaskList | Detail)
│           │   ├── AppSidebar.tsx    # Sidebar navigation (views, categories, tags)
│           │   ├── TaskList.tsx      # Task list with search, sort, add, filter, drag-and-drop
│           │   ├── TaskDetail.tsx    # Task detail panel (edit title/desc, sub-tasks, tags, etc.)
│           │   ├── Statistics.tsx    # Stats dashboard (area chart, summary cards)
│           │   ├── CalendarView.tsx  # Calendar view for tasks
│           │   ├── CategoryDialog.tsx # Create/edit category dialog with color picker
│           │   ├── CommandPalette.tsx # Cmd+K command palette (cmdk)
│           │   ├── ThemeProvider.tsx # Theme provider (next-themes, light/dark mode)
│           │   ├── ErrorBoundary.tsx # React error boundary with retry UI
│           │   └── ui/              # shadcn/ui generated components
│           ├── hooks/
│           │   ├── useKeyboardShortcuts.ts  # Global keyboard shortcuts (Cmd+N, Cmd+F, etc.)
│           │   ├── useDataQueries.ts        # React Query hooks for all CRUD operations
│           │   └── use-mobile.ts            # Mobile detection hook (shadcn)
│           └── utils/
│               ├── date-filters.ts  # Task date filtering (isOverdue, isUpcoming, filterToday)
│               ├── priority.ts      # Priority helpers (rank, color, label, badge classes)
│               └── __tests__/       # Utils tests
├── out/                          # Build output (gitignored)
└── dist/                         # Packaged app output (electron-builder)
```

## Path Aliases

### `@/` — Renderer source

Maps to `src/renderer/src/` and is configured in three places:

1. `tsconfig.json` → `compilerOptions.paths` (TypeScript resolution + shadcn CLI)
2. `tsconfig.web.json` → `compilerOptions.paths` (actual renderer TS compilation)
3. `electron.vite.config.ts` → `renderer.resolve.alias` (Vite bundler resolution)

### `@shared/` — Shared code

Maps to `src/shared/` and is configured in:

1. `tsconfig.node.json` → `compilerOptions.paths` (main + preload TS compilation)
2. `tsconfig.web.json` → `compilerOptions.paths` (renderer TS compilation)
3. `electron.vite.config.ts` → `main.resolve.alias`, `preload.resolve.alias`, `renderer.resolve.alias`

## Key Commands

```bash
bun run dev          # Start dev mode (Electron + Vite HMR)
bun run build        # Production build + electron-builder --mac
bun run build:dev    # Build only (no packaging)
bun run preview      # Preview production build
bun run lint         # ESLint check
bun run format       # Prettier format
bun run test         # Run tests (vitest run)
bun run test:watch   # Run tests in watch mode (vitest)
bun run postinstall  # Rebuild native modules (electron-rebuild -f -w better-sqlite3)
```

## Adding shadcn/ui Components

```bash
bunx --bun shadcn@latest add <component-name>
```

Components are generated into `src/renderer/src/components/ui/` with `@/` import aliases. The `components/ui/` directory has relaxed ESLint rules (no `explicit-function-return-type`, no `react-refresh/only-export-components`) since these files are auto-generated.

## Architecture Conventions

### Electron Process Separation

- **Main process** (`src/main/`): Node.js environment. Handles native OS features, database operations, system notifications, file system access. All external deps are externalized via `externalizeDepsPlugin()`.
- **Preload** (`src/preload/`): Bridge between main and renderer. Uses `contextBridge` to expose safe APIs. Keep this layer thin.
- **Renderer** (`src/renderer/`): Browser environment. Pure React app. Communicates with main process only through preload-exposed APIs.

### Database

- **Engine**: better-sqlite3 with WAL journal mode and foreign keys enabled
- **ORM**: Drizzle ORM for type-safe queries; raw SQL for table creation and migrations
- **Schema**: Defined in `src/main/db/schema.ts` — 5 tables: `tasks`, `sub_tasks`, `categories`, `tags`, `task_tags`
- **Migrations**: Incremental via `ALTER TABLE` in `src/main/db/index.ts` `runMigrations()`; no migration files
- **Location**: `app.getPath('userData')/watermelon.db` in production; `:memory:` for tests via `initTestDatabase()`
- **Indexes**: On `tasks(status)`, `tasks(category_id)`, `tasks(due_date)`, `tasks(priority)`, `sub_tasks(task_id)`, `task_tags(task_id)`, `task_tags(tag_id)`

### IPC Communication

- IPC channel names are centralized in `src/shared/ipc-channels.ts` as a `const` object
- **Main**: `src/main/ipc/handlers.ts` registers all `ipcMain.handle()` handlers, delegates to service layer
- **Preload**: `src/preload/index.ts` wraps `ipcRenderer.invoke()` calls as a typed API object
- **Type safety**: `src/preload/index.d.ts` declares `window.api: XiaoXiguaApi` with full return types
- **Error pattern**: Handlers wrap errors as `{ __error: AppError }`; renderer uses `unwrap()` to extract results or show toast

### State Management

- **UI state**: Zustand store in `src/renderer/src/stores/ui-store.ts` — manages filterView, selectedTask, compactMode, searchQuery, theme, etc.
- **Server/async state**: @tanstack/react-query hooks in `src/renderer/src/hooks/useDataQueries.ts` — all CRUD operations (tasks, categories, tags, sub-tasks) with automatic cache invalidation
- **Legacy context**: `src/renderer/src/context/AppContext.tsx` (useReducer) — being migrated to the above stores
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
- shadcn/ui theme variables defined in `src/renderer/src/index.css` using `oklch` color space
- Light and dark mode support via `.dark` class and `@custom-variant dark`
- Base color: neutral

### Testing

- **Framework**: Vitest (configured in `vitest.config.ts`)
- **Test location**: Co-located `__tests__/` directories next to source files
- **Pattern**: `src/**/__tests__/**/*.test.ts`
- **Environment**: Node (for main-process service tests)
- **Database**: Uses in-memory SQLite (`initTestDatabase()`) for isolated tests
- **Property testing**: fast-check for recurrence rule edge cases
