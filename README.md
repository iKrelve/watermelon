# 🍉 Watermelon (小西瓜)

macOS 极简 Todo 管理桌面应用，UI 风格参考 Things 3。

## 环境要求

- **Node.js** >= 18
- **Bun** (推荐，作为包管理器)
- **macOS** (打包目标平台)

## 安装依赖

```bash
bun install
```

> 安装完成后会自动执行 `postinstall`，重新编译 `better-sqlite3` 原生模块。
> 如果原生模块有问题，可以手动执行：
>
> ```bash
> bun run postinstall
> ```

## 常用命令

### 开发

```bash
# 启动开发模式（Electron + Vite HMR 热更新）
bun run dev
```

### 构建 & 打包

```bash
# 仅构建（不打包成 .app / .dmg），用于本地预览
bun run build:dev

# 预览构建产物（启动 Electron 加载 out/ 目录）
bun run preview

# 完整构建 + 打包 macOS 应用（生成 .dmg 和 .zip）
bun run build
```

打包完成后，产物输出到 `dist/` 目录：

| 文件 | 说明 |
|------|------|
| `小西瓜-<version>-universal.dmg` | macOS 安装镜像（拖拽安装） |
| `小西瓜-<version>-universal.zip` | macOS 压缩包 |

> **打包原理**：`bun run build` 实际执行的是 `electron-vite build && electron-builder --mac`
> 1. `electron-vite build` — 编译 main / preload / renderer 三个进程的代码到 `out/`
> 2. `electron-builder --mac` — 将 `out/` 打包为 macOS 应用（dmg + zip，universal 架构）

### 代码质量

```bash
# ESLint 检查
bun run lint

# Prettier 格式化
bun run format
```

### 测试

```bash
# 运行所有测试（单次执行）
bun run test

# 监听模式（文件变更自动重跑）
bun run test:watch
```

### 添加 shadcn/ui 组件

```bash
bunx --bun shadcn@latest add <component-name>
```

## 项目结构

```
src/
├── shared/       # 主进程 & 渲染进程共享代码（类型、IPC channel 常量）
├── main/         # Electron 主进程（数据库、服务层、IPC 处理）
├── preload/      # 预加载脚本（contextBridge，暴露 window.api）
└── renderer/     # React 渲染进程（UI 组件、状态管理、hooks）
```

## 技术栈

Electron 40 · React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · shadcn/ui · Zustand · React Query · better-sqlite3 · Drizzle ORM
