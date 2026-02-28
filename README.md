# 🍉 小西瓜

macOS 极简 Todo 管理桌面应用，UI 风格参考 Things 3。

## 安装依赖

```bash
bun install
```

首次开发前还需要安装 Rust universal target（构建 Universal Binary 用）：

```bash
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

## 常用命令

```bash
# 开发模式（Vite dev server + Rust backend，支持 HMR）
bun run dev

# 生产打包（macOS Universal Binary，同时支持 Apple Silicon + Intel）
bun run build

# 仅启动前端 Vite dev server（端口 6689）
bun run vite:dev

# 仅构建前端（输出到 dist/）
bun run vite:build

# 测试
bun run test
bun run test:watch

# 代码质量
bun run lint
bun run format

# 添加 shadcn/ui 组件
bunx --bun shadcn@latest add <component-name>
```

## 构建产物

运行 `bun run build` 后，构建产物位于：

```
src-tauri/target/universal-apple-darwin/release/bundle/
├── dmg/          # .dmg 安装镜像
└── macos/        # .app 应用包
```
