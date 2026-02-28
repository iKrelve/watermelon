# 🍉 Watermelon (小西瓜)

macOS 极简 Todo 管理桌面应用，UI 风格参考 Things 3。

## 安装依赖

```bash
bun install
```

## 常用命令

```bash
# 开发模式（Vite dev server + Electrobun watch，支持 HMR）
bun run dev

# 无 HMR 开发模式（先构建前端再启动 Electrobun watch）
bun run dev:no-hmr

# 先构建前端再启动 Electrobun dev（无 watch）
bun run start

# 生产打包（双架构 arm64 + x64，产物在 artifacts/ 目录）
bun run build

# 仅构建 arm64 (Apple Silicon)
bun run build:arm64

# 仅构建 x64 (Intel，通过 Rosetta 2)
bun run build:x64

# 测试
bun run test
bun run test:watch

# 代码质量
bun run lint
bun run format

# 添加 shadcn/ui 组件
bunx --bun shadcn@latest add <component-name>
```
