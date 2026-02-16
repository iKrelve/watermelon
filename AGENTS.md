# AGENTS.md

## Project Overview

Watermelon 是一款面向 macOS 的极简 Todo 管理桌面应用，UI 风格参考 Things 3。

## Tech Stack

- **Runtime / Package Manager**: Bun
- **Desktop Framework**: Electron 40 + electron-vite 5
- **UI Framework**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 7 (via electron-vite)
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first config)
- **Component Library**: shadcn/ui (new-york style, Radix UI primitives)
- **Icons**: lucide-react
- **Linting**: ESLint 9 (flat config) + Prettier

## Project Structure

```
watermelon/
├── electron.vite.config.ts       # Unified build config (main / preload / renderer)
├── package.json                  # Dependencies & scripts (managed by Bun)
├── components.json               # shadcn/ui CLI configuration
├── tsconfig.json                 # Root TS config with path aliases
├── tsconfig.node.json            # TS config for main + preload (Node env)
├── tsconfig.web.json             # TS config for renderer (DOM + JSX)
├── eslint.config.mjs             # ESLint v9 flat config
├── .prettierrc                   # Prettier rules
├── src/
│   ├── main/                     # Electron main process
│   │   └── index.ts              # BrowserWindow creation, IPC setup
│   ├── preload/                  # Preload scripts (contextBridge)
│   │   ├── index.ts
│   │   └── index.d.ts            # Type declarations for exposed APIs
│   └── renderer/                 # React app (Vite project)
│       ├── index.html            # HTML entry
│       └── src/
│           ├── main.tsx          # React entry point
│           ├── App.tsx           # Root component
│           ├── index.css         # Tailwind CSS entry + shadcn theme variables
│           ├── env.d.ts          # Vite client type declarations
│           ├── lib/
│           │   └── utils.ts      # cn() utility (clsx + tailwind-merge)
│           ├── components/
│           │   └── ui/           # shadcn/ui generated components
│           └── hooks/            # Custom React hooks
└── out/                          # Build output (gitignored)
```

## Path Aliases

`@/` maps to `src/renderer/src/` and is configured in three places:

1. `tsconfig.json` → `compilerOptions.paths` (TypeScript resolution + shadcn CLI)
2. `tsconfig.web.json` → `compilerOptions.paths` (actual renderer TS compilation)
3. `electron.vite.config.ts` → `renderer.resolve.alias` (Vite bundler resolution)

## Key Commands

```bash
bun run dev        # Start dev mode (Electron + Vite HMR)
bun run build      # Production build
bun run preview    # Preview production build
bun run lint       # ESLint check
bun run format     # Prettier format
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
